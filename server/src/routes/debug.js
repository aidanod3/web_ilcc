const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const Assembler = require('../interactive_lccjs/src/interactive/iassembler');
const Interpreter = require('../interactive_lccjs/src/interactive/iinterpreter');

const router = express.Router();

// In-memory store of active debug sessions
// key: sessionId, value: { interpreter, listing, createdAt }
const sessions = new Map();

// Auto-cleanup sessions older than 30 minutes
const SESSION_TTL_MS = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, 60 * 1000);

/**
 * POST /api/debug/start
 *
 * Assembles the code and initializes a debug session.
 * Returns the session ID and the initial state (iteration 0).
 *
 * Request body:
 *   code:  string  - the assembly source code
 *   input: string  - (optional) simulated stdin for the program
 *
 * Response:
 *   { sessionId, state, listing }
 */
router.post('/start', (req, res) => {
  const { code, input } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "code" field.' });
  }

  // Write code to a temp file so the assembler can read it
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ilcc-'));
  const srcPath = path.join(tmpDir, 'program.a');

  try {
    fs.writeFileSync(srcPath, code);

    // --- Assemble ---
    const assembler = new Assembler();
    assembler.inputFileName = srcPath;
    assembler.outputFileName = path.join(tmpDir, 'program.e');
    assembler.main([srcPath]);

    // Read the compiled .e file into a buffer
    const executableBuffer = fs.readFileSync(assembler.outputFileName);

    // --- Set up interpreter ---
    const interpreter = new Interpreter();
    interpreter.options = { interactiveMode: true };

    if (input) {
      interpreter.inputBuffer = input;
    }

    // Load executable into memory (bypasses file I/O)
    interpreter.loadExecutableBuffer(executableBuffer);
    interpreter.initialMem = interpreter.mem.slice();

    // Initialize the snapshot log (creates snapshot[0])
    interpreter.initializeLog();

    // Build the listing map (PC -> source line)
    const listing = interpreter.locationLineMap(assembler.listing);

    // Get the initial state diff (iteration 0 vs 0)
    const state = interpreter.stateUpdates(0, 0);

    // Create session
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {
      interpreter,
      listing,
      createdAt: Date.now(),
    });

    res.json({
      sessionId,
      state,
      listing,
      iteration: interpreter.currentIteration,
      running: interpreter.running,
    });
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

/**
 * POST /api/debug/step
 *
 * Steps the interpreter forward or backward.
 *
 * Request body:
 *   sessionId: string  - the debug session ID
 *   count:     number  - steps to take (positive = forward, negative = backward)
 *
 * Response:
 *   { state, iteration, running, output }
 */
router.post('/step', (req, res) => {
  const { sessionId, count } = req.body;

  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Invalid or expired session.' });
  }

  const stepCount = typeof count === 'number' ? count : 1;
  const session = sessions.get(sessionId);
  const { interpreter } = session;

  try {
    const prevIteration = interpreter.currentIteration;

    interpreter.handleSteps(stepCount);

    const newIteration = interpreter.currentIteration;
    const state = interpreter.stateUpdates(prevIteration, newIteration);

    res.json({
      state,
      iteration: newIteration,
      running: interpreter.running,
      output: interpreter.output,
    });
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

/**
 * POST /api/debug/stop
 *
 * Destroys a debug session and frees its memory.
 *
 * Request body:
 *   sessionId: string
 */
router.post('/stop', (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Invalid or expired session.' });
  }

  sessions.delete(sessionId);
  res.json({ success: true });
});

/**
 * GET /api/debug/state/:sessionId
 *
 * Returns the full current state without stepping.
 * Useful if the client needs to re-sync (e.g., after a reconnect).
 */
router.get('/state/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Invalid or expired session.' });
  }

  const { interpreter, listing } = sessions.get(sessionId);

  // Full state: diff from iteration 0 to current
  const state = interpreter.stateUpdates(0, interpreter.currentIteration);

  res.json({
    state,
    listing,
    iteration: interpreter.currentIteration,
    running: interpreter.running,
    output: interpreter.output,
  });
});

module.exports = router;
