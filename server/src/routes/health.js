const express = require('express');
const config = require('../config');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: config.version,
    uptimeSec: Math.round((Date.now() - config.bootedAt) / 1000),
  });
});

/* Readiness: DB reachable (the require ran migrations) and downloads dir exists. */
router.get('/ready', (req, res) => {
  try {
    require('../db').prepare('SELECT 1').get();
    require('fs').accessSync(config.downloadsDir);
    res.json({ ready: true });
  } catch (e) {
    res.status(503).json({ ready: false, reason: e.message });
  }
});

module.exports = router;
