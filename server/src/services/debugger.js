/*
 * debugger.js — Step-by-step debug service.
 *
 * Assembles source code, loads it into the interpreter, and exposes a
 * step(n) method that executes n instructions and returns a state diff.
 * The interpreter instance lives for the lifetime of the session.
 *
 * Usage:
 *   const session = createDebugSession(sourceCode, callbacks);
 *   const diff    = await session.step(1);   // execute one instruction
 *   session.provideInput('42');              // resume after input_request
 *   session.cleanup();                       // delete temp files
 *
 * Callbacks:
 *   onOutput(text)     — called on every write (AOUT, DOUT, SOUT, etc.)
 *   onInputRequest()   — called when the program hits SIN/DIN with no buffered input
 *   onDone()           — called when the program halts normally
 *   onError(message)   — called on assembly or runtime errors
 *
 * step(n) returns a diff object:
 *   {
 *     pc:        number,
 *     ir:        number,
 *     registers: { r0: number, r2: number, ... },   ← only changed
 *     flags:     { n: 0, z: 1, c: 0, v: 0 },        ← only changed
 *   }
 */

const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const crypto = require('crypto');

const Assembler   = require('../web_ilcc/assembler');
const Interpreter = require('../web_ilcc/interpreter');

function createDebugSession(sourceCode, callbacks) {
  const { onOutput, onInputRequest, onDone, onError } = callbacks;

  /* ── 1. Write source to a temp .a file ── */
  const id    = crypto.randomUUID();
  const aPath = path.join(os.tmpdir(), `lcc-${id}.a`);
  let   ePath = null;

  fs.writeFileSync(aPath, sourceCode, 'utf8');

  /* ── 2. Assemble .a → .e ── */
  const assembler = new Assembler();
  try {
    assembler.main([aPath]);
    ePath = assembler.outputFileName;
  } catch (err) {
    cleanup();
    onError(err.message);
    return null;
  }

  /* ── 3. Create and configure the interpreter ── */
  const interp = new Interpreter();
  interp.onOutput       = onOutput;
  interp.onInputRequest = onInputRequest;
  interp.loadExecutableFile(ePath);

  /* ── Helpers ── */

  function cleanup() {
    try { fs.unlinkSync(aPath); } catch {}
    if (ePath) { try { fs.unlinkSync(ePath); } catch {} }
  }

  /* Capture a snapshot of CPU state. */
  function captureState() {
    return {
      pc:        interp.pc,
      ir:        interp.ir,
      registers: Array.from(interp.r),
      flags:     { n: interp.n, z: interp.z, c: interp.c, v: interp.v },
    };
  }

  /* Flatten the interpreter's raw memoryChanges into individual cell diffs.
     Each raw entry covers one or more consecutive addresses (e.g. SIN writes
     a whole string starting at change.address).  We expand those into one
     { addr, old, new } object per cell so the frontend can do O(1) lookups. */
  function normalizeMemoryChanges(rawChanges) {
    const cells = [];
    for (const change of rawChanges) {
      const base = change.address;
      const len  = Math.min((change.old || []).length, (change.new || []).length);
      for (let i = 0; i < len; i++) {
        cells.push({
          addr: (base + i) & 0xffff,
          old:  change.old[i],
          new:  change.new[i],
        });
      }
    }
    return cells;
  }

  /* Build a full state diff between two snapshots.
     Every field carries both the old and new value so the client can render
     "old → new" highlights without needing to remember the previous state. */
  function buildDiff(before, after) {
    const registers = [];
    for (let i = 0; i < 8; i++) {
      registers.push({ old: before.registers[i], new: after.registers[i] });
    }

    const flags = {};
    for (const f of ['n', 'z', 'c', 'v']) {
      flags[f] = { old: before.flags[f], new: after.flags[f] };
    }

    return {
      pc:        { old: before.pc, new: after.pc },
      ir:        { old: before.ir, new: after.ir },
      registers,
      flags,
    };
  }

  /* ── Public session API ── */
  return {
    /* Execute n instructions. Returns the state diff, or undefined if
       the session was already halted before the step was called. */
    async step(n = 1) {
      if (!interp.running) {
        onDone();
        return;
      }

      const before = captureState();

      /* Clear the change log so we only capture writes from this step. */
      interp.memoryChanges = [];

      try {
        await interp.handleSteps(n);
      } catch (err) {
        cleanup();
        onError(`Runtime error: ${err.message}`);
        return;
      }

      const after = captureState();
      const diff  = buildDiff(before, after);

      /* Attach flattened memory changes so the client can update its map. */
      diff.memory = normalizeMemoryChanges(interp.memoryChanges);

      if (!interp.running) {
        onDone();
      }

      return diff;
    },

    /* Called when the user submits input in the terminal. */
    provideInput(text) {
      interp.inputBuffer += text + '\n';
      if (interp._inputResolve) {
        const resolve = interp._inputResolve;
        interp._inputResolve = null;
        resolve();
      }
    },

    cleanup,
  };
}

module.exports = { createDebugSession };
