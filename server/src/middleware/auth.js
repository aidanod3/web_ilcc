/*
 * auth.js — identity from Traefik forward-auth, and role gates.
 *
 * Identity never comes from cookies here. Traefik's hydra-forward-auth
 * middleware calls hydra-auth, which validates the SAML/JWT session and
 * returns X-Hydra-User / X-Hydra-Email / X-Hydra-Roles. Traefik copies
 * those onto the proxied request.
 *
 * Because anything that can reach this pod directly could forge those
 * headers, we only honour them when BOTH hold:
 *   1. the TCP peer is inside TRUSTED_PROXY_CIDR (the cluster pod network), and
 *   2. X-Hydra-Proxy-Secret equals HYDRA_PROXY_SECRET (added by the
 *      ilcc-proxy-secret Traefik middleware, which sits after forward-auth).
 * Otherwise the headers are deleted before any route sees them.
 */

const ipaddr = require('ipaddr.js');
const config = require('../config');
const logger = require('../logger');
const staff  = require('../services/staff');

const cidrs = config.trustedProxyCidrs.map(c => {
  const [addr, bits] = c.includes('/') ? c.split('/') : [c, null];
  const parsed = ipaddr.parse(addr);
  return [parsed, bits == null ? (parsed.kind() === 'ipv6' ? 128 : 32) : Number(bits)];
});

function peerIsTrusted(remoteAddress) {
  if (!remoteAddress) return false;
  let ip;
  try { ip = ipaddr.process(remoteAddress); } catch { return false; }
  return cidrs.some(([net, bits]) => {
    if (ip.kind() !== net.kind()) return false;
    return ip.match(net, bits);
  });
}

function secretMatches(req) {
  if (!config.hydraProxySecret) return !config.isProd;   // dev: no secret required
  const got = req.get('x-hydra-proxy-secret') || '';
  return got.length === config.hydraProxySecret.length &&
    require('crypto').timingSafeEqual(Buffer.from(got), Buffer.from(config.hydraProxySecret));
}

/* Global, mounted first. Sets req.user or null. */
function stripForgedHeaders(req, res, next) {
  const trusted = peerIsTrusted(req.socket?.remoteAddress) && secretMatches(req);
  if (!trusted) {
    delete req.headers['x-hydra-user'];
    delete req.headers['x-hydra-email'];
    delete req.headers['x-hydra-roles'];
    delete req.headers['x-hydra-proxy-secret'];
    req.user = null;
    return next();
  }

  const email = (req.get('x-hydra-email') || '').trim().toLowerCase();
  if (!email) { req.user = null; return next(); }

  const roles = (req.get('x-hydra-roles') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  req.user = {
    email,
    netid: (req.get('x-hydra-user') || email.split('@')[0]).toLowerCase(),
    roles,
    role: null,
  };

  /* Faculty are admins. Persist so they show in the Staff list and keep the
     role even if a later request arrives without the roles header. */
  if (roles.includes('faculty')) {
    try { staff.ensureAdmin(email, 'faculty-affiliation'); }
    catch (e) { logger.warn({ err: e, email }, 'ensureAdmin failed'); }
  }
  try { req.user.role = staff.getRole(email); } catch { req.user.role = null; }

  next();
}

function requireSSO(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'sso_required', login: `${config.publicBase}/api/me?login=1` });
  }
  if (!req.user.email.endsWith('@newpaltz.edu')) {
    return res.status(403).json({ error: 'newpaltz_only' });
  }
  next();
}

const RANK = { ta: 1, admin: 2 };
function requireRole(min) {
  if (!RANK[min]) throw new Error(`unknown role ${min}`);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'sso_required' });
    const have = RANK[req.user.role] || 0;
    if (have < RANK[min]) {
      logger.info({ email: req.user.email, path: req.path, need: min, have: req.user.role }, 'forbidden');
      return res.status(403).json({ error: 'forbidden', required: min, role: req.user.role });
    }
    next();
  };
}

module.exports = { stripForgedHeaders, requireSSO, requireRole, peerIsTrusted };
