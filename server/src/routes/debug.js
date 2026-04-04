/*
 * routes/debug.js — Debug session endpoints.
 *
 * Manages debug sessions in memory. Each session holds an interpreter
 * instance with full snapshot history for forward/backward stepping.
 *
 * Delegates all emulator logic to ilcc/debug.js (DebugSession class).
 *
 * Endpoints:
 *   POST /api/debug/start         — assemble code and create session
 *   POST /api/debug/step          — step forward or backward
 *   POST /api/debug/stop          — destroy session
 *   GET  /api/debug/state/:id     — get full current state (re-sync)
 */

const express = require('express');
const crypto = require('crypto');
const { DebugSession } = require('../ilcc/debug');

const router = express.Router();

/* In-memory store: sessionId → { session: DebugSession, createdAt: number } */
const sessions = new Map();

/* Auto-cleanup sessions older than 30 minutes */
const SESSION_TTL_MS = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (now - entry.createdAt > SESSION_TTL_MS) {
      entry.session.cleanup();
      sessions.delete(id);
    }
  }
}, 60 * 1000);

/**
 * POST /api/debug/start
 *
 * Request body:
 *   code:  string  — assembly source code
 *   input: string  — (optional) simulated stdin
 *
 * Response:
 *   { sessionId, state, iteration, programRunning }
 */
router.post('/start', (req, res) => {
  const { code, input } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "code" field.' });
  }

  try {
    const session = new DebugSession();
    const { state } = session.start(code, { input: input || '' });

    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, { session, createdAt: Date.now() });

    res.json({
      sessionId,
      state,
      iteration: 0,
      programRunning: session.interpreter.running,
    });
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

/**
 * POST /api/debug/step
 *
 * Request body:
 *   sessionId: string  — the debug session ID
 *   count:     number  — steps to take (positive = forward, negative = backward)
 *
 * Response:
 *   { state, diff, iteration, programRunning, output }
 */
router.post('/step', (req, res) => {
  const { sessionId, count } = req.body;

  const entry = sessions.get(sessionId);
  if (!entry) {
    return res.status(404).json({ error: 'Invalid or expired session.' });
  }

  try {
    const stepCount = typeof count === 'number' ? count : 1;
    const result = entry.session.step(stepCount);

    res.json({
      state: result.state,
      diff: result.diff,
      iteration: result.state.iteration,
      programRunning: result.programRunning,
      output: result.state.output,
    });
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

/**
 * POST /api/debug/stop
 *
 * Request body:
 *   sessionId: string
 */
router.post('/stop', (req, res) => {
  const { sessionId } = req.body;

  const entry = sessions.get(sessionId);
  if (!entry) {
    return res.status(404).json({ error: 'Invalid or expired session.' });
  }

  entry.session.cleanup();
  sessions.delete(sessionId);
  res.json({ success: true });
});

/**
 * GET /api/debug/state/:sessionId
 *
 * Returns the full current state without stepping.
 * Useful for client re-sync after reconnect.
 */
router.get('/state/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const entry = sessions.get(sessionId);
  if (!entry) {
    return res.status(404).json({ error: 'Invalid or expired session.' });
  }

  try {
    const result = entry.session.getFullState();
    res.json({
      state: result.state,
      programRunning: result.programRunning,
    });
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

module.exports = router;
