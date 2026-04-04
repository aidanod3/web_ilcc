/*
 * run.js — Run pathway for the LCC emulator.
 *
 * Takes assembly source code as a string, assembles it, executes it
 * to completion, and returns the program output.
 *
 * Flow:
 *   1. Write source to a temp file (assembler expects a file path)
 *   2. Assemble: source → .e executable
 *   3. Load executable into interpreter
 *   4. Execute to completion (with instruction cap for safety)
 *   5. Return output + final state
 *   6. Clean up temp files
 *
 * The interpreter's inputBuffer is pre-filled if the caller provides
 * simulated stdin, so no actual stdin reads block the server.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const Assembler = require('../reference/interactive_lccjs/src/interactive/iassembler');
const Interpreter = require('../reference/interactive_lccjs/src/interactive/iinterpreter');

/**
 * Assemble and run an LCC program to completion.
 *
 * @param {string} source — The assembly source code.
 * @param {object} [options]
 * @param {string} [options.input]          — Simulated stdin for DIN/AIN/SIN/HIN traps.
 * @param {number} [options.instructionCap] — Max instructions before forced halt (default 500000).
 * @returns {{ output: string, error: string|null }}
 */
function runProgram(source, options = {}) {
  /* Unique ID so concurrent requests don't collide on temp files */
  const id = crypto.randomBytes(8).toString('hex');
  const tmpDir = os.tmpdir();
  const srcPath = path.join(tmpDir, `lcc_${id}.a`);
  const exePath = path.join(tmpDir, `lcc_${id}.e`);

  try {
    /* ── 1. Write source to temp file ── */
    fs.writeFileSync(srcPath, source);

    /* ── 2. Assemble ── */
    const assembler = new Assembler();
    assembler.inputFileName = srcPath;
    assembler.outputFileName = exePath;
    assembler.main([srcPath]);

    /* If the assembler produced an object module (.o) it needs linking — not supported yet */
    if (assembler.isObjectModule) {
      return { output: '', error: 'Object modules (.o) require linking, which is not yet supported.' };
    }

    /* ── 3. Load executable into interpreter ── */
    const interpreter = new Interpreter();
    interpreter.options = { efficicentMode: true }; /* only keep last 2 snapshots */
    interpreter.inputBuffer = options.input || '';

    if (options.instructionCap != null) {
      interpreter.instructionsCap = options.instructionCap;
    }

    interpreter.loadExecutableFile(exePath);

    /* ── 4. Execute to completion ── */
    while (interpreter.running) {
      interpreter.handleSteps(1);
    }

    /* ── 5. Return output ── */
    return { output: interpreter.output, error: null };

  } catch (err) {
    return { output: '', error: err.message };

  } finally {
    /* ── 6. Clean up temp files ── */
    try { fs.unlinkSync(srcPath); } catch (_) {}
    try { fs.unlinkSync(exePath); } catch (_) {}
  }
}

module.exports = { runProgram };
