/*
 * me.js — who am I. Always 200 so the client can render a signed-out state.
 * GET /api/me?login=1 is placed behind forward-auth in the IngressRoute; an
 * anonymous browser navigating to it gets the SAML redirect, then lands back
 * here and we bounce to the downloads page.
 */
const express = require('express');
const config = require('../config');

const router = express.Router();

router.get('/', (req, res) => {
  /* ?login=1: bounce to hydra-auth's SAML entry, then back to `return`. */
  if (req.query.login === '1') {
    const back = String(req.query.return || `${config.publicBase}/`);
    const safe = back.startsWith('/') && !back.startsWith('//') ? back : `${config.publicBase}/`;
    return res.redirect(302, `/login?returnTo=${encodeURIComponent(safe)}`);
  }
  if (!req.user) return res.json({ anonymous: true });
  const { email, netid, role } = req.user;
  res.json({ email, netid, role });
});

module.exports = router;
