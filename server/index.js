/*
 * index.js — ILCC server.
 *
 * One process serves:
 *   - the built React client (client/dist) with SPA fallback
 *   - REST under /api (health, demos, me, staff, downloads, grader, submissions)
 *   - WebSockets at /api/run and /api/debug (assemble + execute LCC programs)
 *
 * Identity comes from Traefik forward-auth headers (see middleware/auth.js).
 * Paths here are what the pod sees AFTER Traefik strips PUBLIC_BASE.
 */

const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const express = require('express');
const helmet  = require('helmet');
const { WebSocketServer } = require('ws');

const config = require('./src/config');
const logger = require('./src/logger');

/* Make fatalExit() throw instead of process.exit() inside the assembler and
   interpreter. They were written as CLIs; this shim keeps one bad program
   from taking the server down. Lives here until the worker-thread refactor. */
global.it = function () {};

const { stripForgedHeaders, requireSSO, requireRole } = require('./src/middleware/auth');
const { notFound, errorHandler } = require('./src/middleware/errors');
const { handleRunSocket }   = require('./src/routes/run');
const { handleDebugSocket } = require('./src/routes/debug');

/* Boot-time side effects: migrations run on require, then seed admins. */
require('./src/db');
require('./src/services/staff').seedAdmins();

const app    = express();
const server = http.createServer(app);

app.disable('x-powered-by');
app.set('trust proxy', config.trustedProxyCidrs);
app.use(helmet({
  contentSecurityPolicy: false,   // SPA + inline CodeMirror styles; revisit with a nonce later
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '256kb' }));
app.use(stripForgedHeaders);

/* ---- API ------------------------------------------------------------- */
app.use('/api',             require('./src/routes/health'));
app.use('/api/me',          require('./src/routes/me'));
app.use('/api/demos',       require('./src/routes/demos'));
app.use('/api/downloads',   require('./src/routes/downloads'));
app.use('/api/staff',       requireRole('admin'), require('./src/routes/staff'));
app.use('/api/grader',      requireRole('ta'),    require('./src/routes/grader'));
app.use('/api',             requireSSO,           require('./src/routes/student'));   // /assignments/open, /submissions*

app.use('/api', notFound);

/* ---- Static client + SPA fallback ----------------------------------- */
const distDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '1h', immutable: false }));
  app.use('/assets', express.static(path.join(distDir, 'assets'), { maxAge: '1y', immutable: true }));
  app.get('/{*splat}', (req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  logger.warn({ distDir }, 'client/dist not found — API only');
}

app.use(notFound);
app.use(errorHandler);

/* ---- WebSockets ------------------------------------------------------ */
const wss = new WebSocketServer({ noServer: true, maxPayload: config.wsMaxPayload });
const sessionsPerIp = new Map();

server.on('upgrade', (request, socket, head) => {
  const url = (request.url || '').split('?')[0];
  if (url !== '/api/run' && url !== '/api/debug') {
    socket.destroy();
    return;
  }

  const ip = request.socket.remoteAddress || 'unknown';
  const n = sessionsPerIp.get(ip) || 0;
  if (n >= config.maxSessionsPerIp) {
    logger.info({ ip, n }, 'ws session cap hit');
    socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    sessionsPerIp.set(ip, n + 1);
    const release = () => {
      const cur = sessionsPerIp.get(ip) || 1;
      if (cur <= 1) sessionsPerIp.delete(ip); else sessionsPerIp.set(ip, cur - 1);
    };
    ws.once('close', release);
    ws.once('error', release);

    /* Idle timeout: close sessions nobody has talked to in a while. */
    let idle = setTimeout(() => ws.close(1000, 'idle'), config.sessionIdleMs);
    ws.on('message', () => { clearTimeout(idle); idle = setTimeout(() => ws.close(1000, 'idle'), config.sessionIdleMs); });
    ws.once('close', () => clearTimeout(idle));

    (url === '/api/run' ? handleRunSocket : handleDebugSocket)(ws);
  });
});

server.listen(config.port, () => {
  logger.info({ port: config.port, base: config.publicBase, env: config.env }, 'ilcc listening');
});

/* Graceful shutdown for Kubernetes. */
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    logger.info({ sig }, 'shutting down');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}

module.exports = { app, server };
