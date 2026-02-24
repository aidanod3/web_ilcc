const express = require('express');
const { createSession, getSession, destroySession } = require('../services/debugSession');

const router = express.Router();

// POST /api/debug/start - Create a new debug session
router.post('/start', async (req, res) => {
  const { sourceCode, fileNames } = req.body;

  if (!sourceCode) {
    return res.status(400).json({ error: 'Missing sourceCode' });
  }

  try {
    const result = await createSession(sourceCode, fileNames);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST /api/debug/:id/step - Step forward or backward
router.post('/:id/step', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Debug session not found' });
  }

  const { count } = req.body;
  if (typeof count !== 'number') {
    return res.status(400).json({ error: 'Missing count (positive = forward, negative = backward)' });
  }

  // TODO: Integrate with iinterpreter stepping when adapted for web use
  res.json({
    state: {
      stepNumber: session.currentStep,
      totalSteps: session.snapshots.length,
      pc: '0x0000',
      ir: '0x0000',
      registers: { r0: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0, r6: 0, r7: 0 },
      flags: { n: 0, z: 0, c: 0, v: 0 },
      memoryChanges: [],
      output: '',
      running: session.running,
    },
  });
});

// GET /api/debug/:id/state - Get current state
router.get('/:id/state', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Debug session not found' });
  }

  res.json({
    state: {
      stepNumber: session.currentStep,
      totalSteps: session.snapshots.length,
      running: session.running,
    },
  });
});

// DELETE /api/debug/:id - Destroy session
router.delete('/:id', async (req, res) => {
  await destroySession(req.params.id);
  res.json({ success: true });
});

module.exports = router;
