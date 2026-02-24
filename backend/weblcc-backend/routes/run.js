const express = require('express');
const { runEmulator } = require('../services/emulator');

const router = express.Router();

router.post('/', async (req, res) => {
  const source = req.body && req.body.source;
  if (!source || typeof source !== 'string') {
    return res.status(400).json({ error: 'Missing source' });
  }

  try {
    const result = await runEmulator(source);
    return res.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});

module.exports = router;
