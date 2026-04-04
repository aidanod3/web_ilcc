/*
 * routes/run.js — POST /api/run
 *
 * Assembles and runs an LCC program to completion.
 * Delegates all emulator logic to ilcc/run.js.
 */

const express = require('express');
const { runProgram } = require('../ilcc/run');

const router = express.Router();

/**
 * POST /api/run
 *
 * Request body:
 *   code:  string  — assembly source code
 *   input: string  — (optional) simulated stdin for DIN/AIN/SIN/HIN
 *
 * Response:
 *   { output: string }           on success
 *   { error: string }            on failure
 */
router.post('/', (req, res) => {
  const { code, input } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "code" field.' });
  }

  const result = runProgram(code, { input: input || '' });

  if (result.error) {
    return res.status(422).json({ error: result.error });
  }

  res.json({ output: result.output });
});

module.exports = router;
