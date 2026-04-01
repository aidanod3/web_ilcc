const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');

const LCC = require('../interactive_lccjs/src/core/lcc');

const router = express.Router();

/**
 * POST /api/run
 *
 * Assembles and runs an LCC program to completion.
 * Returns the program's output string.
 *
 * Request body:
 *   code:  string  - the assembly source code
 *   input: string  - (optional) simulated stdin for the program
 *
 * Response:
 *   { output: string } on success
 *   { error: string }  on failure
 */
router.post('/', (req, res) => {
  const { code, input } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "code" field.' });
  }

  // Write code to a temp file so LCC can read it as a .a file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lcc-'));
  const srcPath = path.join(tmpDir, 'program.a');

  try {
    fs.writeFileSync(srcPath, code);

    const lcc = new LCC();
    lcc.generateStats = false;

    // Pre-fill input buffer so stdin reads don't block
    if (input) {
      lcc.inputBuffer = input;
    }

    // Assemble and execute
    lcc.main([srcPath]);

    const output = lcc.interpreter ? lcc.interpreter.output : '';

    res.json({ output });
  } catch (err) {
    res.status(422).json({ error: err.message });
  } finally {
    // Clean up temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {
      // ignore cleanup errors
    }
  }
});

module.exports = router;
