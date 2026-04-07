/*
 * debug.js — Debug pathway for the LCC emulator.
 *
 * Provides a DebugSession class that holds interpreter state in memory
 * and exposes step-forward / step-backward with state diffs.
 *
 * Lifecycle (managed by the route layer):
 *   1. const session = new DebugSession();
 *   2. session.start(sourceCode)       → initial state
 *   3. session.step(n)                 → diff after stepping n instructions
 *   4. session.getFullState()          → current full state (registers, flags, pc, memory slice)
 *   5. (repeat 3/4 as needed)
 *
 * The interpreter's snapshot array records every state so we can step
 * backward by restoring from history.
 *
 * Memory diffs: stateUpdates() returns only the addresses that changed
 * between two iterations, so the frontend doesn't need the full 64K.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const Assembler = require('../reference/interactive_lccjs/src/interactive/iassembler');
const Interpreter = require('../reference/interactive_lccjs/src/interactive/iinterpreter');

class DebugSession {
  constructor() {
    this.interpreter = null;  /* Set after start() */
    this.iteration = 0;       /* Current step index */
    this.tmpFiles = [];       /* Temp file paths to clean up */
  }

  /**
   * Assemble source code and initialize the interpreter for stepping.
   *
   * @param {string} source — Assembly source code.
   * @param {object} [options]
   * @param {string} [options.input] — Simulated stdin for DIN/AIN/SIN/HIN.
   * @returns {{ state: object }} — The initial CPU state (iteration 0).
   */
  start(source, options = {}) {
    /* Clean up any previous session */
    this.cleanup();

    const id = crypto.randomBytes(8).toString('hex');
    const tmpDir = os.tmpdir();
    const srcPath = path.join(tmpDir, `lcc_dbg_${id}.a`);
    const exePath = path.join(tmpDir, `lcc_dbg_${id}.e`);
    this.tmpFiles = [srcPath, exePath];

    /* ── Assemble ── */
    fs.writeFileSync(srcPath, source);

    const assembler = new Assembler();
    assembler.inputFileName = srcPath;
    assembler.outputFileName = exePath;
    assembler.main([srcPath]);

    if (assembler.isObjectModule) {
      throw new Error('Object modules (.o) require linking, which is not yet supported.');
    }

    /* ── Load into interpreter ── */
    const interp = new Interpreter();
    interp.options = { interactiveMode: true };
    interp.inputBuffer = options.input || '';
    interp.loadExecutableFile(exePath);

    /* Initialize the snapshot log (creates snapshot[0]) */
    interp.initializeLog();

    this.interpreter = interp;
    this.iteration = 0;

    return { state: this._currentState() };
  }

  /**
   * Step forward (positive n) or backward (negative n).
   *
   * @param {number} n — Number of steps. Positive = forward, negative = backward.
   * @returns {{ state: object, diff: object, programRunning: boolean }}
   */
  step(n) {
    if (!this.interpreter) {
      throw new Error('No active debug session. Call start() first.');
    }

    const prevIteration = this.iteration;

    /* handleSteps mutates interpreter state and updates currentIteration */
    this.interpreter.handleSteps(n);
    this.iteration = this.interpreter.currentIteration;

    /* Compute the diff between the old and new iterations */
    const diff = this.interpreter.stateUpdates(prevIteration, this.iteration);

    return {
      state: this._currentState(),
      diff,
      programRunning: this.interpreter.running,
    };
  }

  /**
   * Get full current state without stepping.
   * Useful for initial render or re-sync.
   */
  getFullState() {
    if (!this.interpreter) {
      throw new Error('No active debug session.');
    }
    return {
      state: this._currentState(),
      programRunning: this.interpreter.running,
    };
  }

  /**
   * Build a compact state object from the current interpreter state.
   * This is what gets sent to the frontend.
   */
  _currentState() {
    const interp = this.interpreter;
    return {
      pc: interp.pc,
      ir: interp.ir,
      registers: Array.from(interp.r),
      flags: { n: interp.n, z: interp.z, c: interp.c, v: interp.v },
      iteration: this.iteration,
      output: interp.output,
      /* Stack: from sp (r6) up to 0xFFFF */
      sp: interp.r[6],
      fp: interp.r[5],
    };
  }

  /**
   * Clean up temp files and release interpreter memory.
   */
  cleanup() {
    for (const f of this.tmpFiles) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
    this.tmpFiles = [];
    this.interpreter = null;
    this.iteration = 0;
  }
}

module.exports = { DebugSession };
