/*
 * runner.js — Run-to-completion service.
 *
 * Assembles source code from a string, loads it into the interpreter,
 * and runs it until the program finishes or needs user input.
 *
 * Usage:
 *   const session = createRunSession(sourceCode, callbacks);
 *   session.start();                  // begin execution
 *   session.provideInput('42');       // resume after an input_request
 *   session.cleanup();                // delete temp files
 *
 * Callbacks:
 *   onOutput(text)     — called on every write (AOUT, DOUT, SOUT, etc.)
 *   onInputRequest()   — called when the program hits SIN/DIN with no buffered input
 *   onDone()           — called when the program halts normally
 *   onError(message)   — called on assembly or runtime errors
 */

const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const crypto = require('crypto');

const Assembler   = require('../web_ilcc/assembler');
const Interpreter = require('../web_ilcc/interpreter');

function createRunSession(sourceCode, callbacks) {
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
  interp.onOutput = onOutput;
  interp.onInputRequest = onInputRequest;
  interp.loadExecutableFile(ePath);

  /* ── Helpers ── */

  function cleanup() {
    try { fs.unlinkSync(aPath); } catch {}
    if (ePath) { try { fs.unlinkSync(ePath); } catch {} }
  }

  /* Run the interpreter to completion. Suspends automatically at input
     instructions and resumes when provideInput() resolves the promise. */
  async function run() {
    try {
      while (interp.running) {
        await interp.handleSteps(1);
      }
    } catch (err) {
      cleanup();
      onError(`Runtime error: ${err.message}`);
      return;
    }
    cleanup();
    onDone();
  }

  /* ── Public session API ── */
  return {
    start() {
      run();  // fire and forget — errors handled inside run()
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

module.exports = { createRunSession };
