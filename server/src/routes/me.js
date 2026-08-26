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
  if (req.query.login === '1') {
    return res.redirect(302, `${config.publicBase}/downloads`);
  }
  if (!req.user) return res.json({ anonymous: true });
  const { email, netid, role } = req.user;
  res.json({ email, netid, role });
});

module.exports = router;
