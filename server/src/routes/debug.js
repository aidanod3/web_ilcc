/*
 * routes/debug.js — WebSocket handler for the step-by-step debug workflow.
 *
 * Clients connect to ws://<host>/api/debug, then exchange messages:
 *
 *   client → server:
 *     { type: 'start', code }    — assemble and load; does NOT begin executing
 *     { type: 'step',  n }       — execute n instructions, get state diff back
 *     { type: 'input', text }    — provide input when program hits SIN/DIN
 *     { type: 'breakpoints', lines } — set breakpoint source lines (1-based)
 *     { type: 'continue' }        — run until a breakpoint / halt / input
 *
 *   server → client:
 *     { type: 'output',      text }           — program printed something
 *     { type: 'input_request'      }          — program needs user input
 *     { type: 'step_result', diff, iteration, continued? } — state diff after step/continue
 *     { type: 'breakpoints_ack', lines, resolved }
 *     { type: 'error',       message }        — assembly or runtime error
 *     { type: 'done'               }          — program reached HALT
 */

const { createDebugSession } = require('../services/debugger');

function handleDebugSocket(ws) {
  let session   = null;
  let iteration = 0;
  let breakpointAddrs = [];

  /* Helper: send a typed JSON message to the client. */
  function send(obj) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      send({ type: 'error', message: 'Invalid message format.' });
      return;
    }

    switch (msg.type) {

      /* ── start: assemble + load, but don't execute yet ── */
      case 'start': {
        if (!msg.code || !msg.code.trim()) {
          send({ type: 'error', message: 'No code provided.' });
          return;
        }

        session = createDebugSession(msg.code, {
          onOutput:       (text)    => send({ type: 'output', text }),
          onInputRequest: ()        => send({ type: 'input_request' }),
          onDone:         ()        => send({ type: 'done' }),
          onError:        (message) => send({ type: 'error', message }),
        });

        iteration = 0;
        breakpointAddrs = [];

        /* Send the initial program-area memory so the Memory panel is
           pre-populated with the loaded executable's contents.
           Also send the address→line map so the editor can highlight
           the current instruction, and the initial PC so the first
           line is highlighted before any step is taken. */
        if (session) {
          const cells     = session.getInitialMemory();
          const map       = session.getLineMap();
          const initialPc = session.getInitialPc();
          send({ type: 'memory_init', cells });
          send({ type: 'line_map', map, initialPc });
        }
        break;
      }

      /* ── step: execute n instructions and return the state diff ── */
      case 'step': {
        if (!session) return;

        const n    = msg.n ?? 1;
        const diff = await session.step(n);

        if (diff) {
          iteration += n;
          send({ type: 'step_result', diff, iteration });
        }
        break;
      }

      /* ── breakpoints: replace the set of 1-based source lines ── */
      case 'breakpoints': {
        if (!session) return;
        const lines = Array.isArray(msg.lines) ? msg.lines.map(Number).filter(Number.isInteger) : [];
        breakpointAddrs = lines.map(l => session.lineToAddr(l)).filter(a => a != null);
        send({ type: 'breakpoints_ack', lines, resolved: breakpointAddrs.length });
        break;
      }

      /* ── continue: run to the next breakpoint / halt / input ── */
      case 'continue': {
        if (!session) return;
        const diff = await session.continueTo(breakpointAddrs);
        if (diff) {
          iteration += diff.steps;
          send({ type: 'step_result', diff, iteration, continued: true });
        }
        break;
      }

      /* ── input: provide input to a paused SIN/DIN ── */
      case 'input': {
        if (!session) return;
        session.provideInput(msg.text ?? '');
        break;
      }
    }
  });

  /* Clean up temp files if the client disconnects mid-session. */
  ws.on('close', () => {
    session?.cleanup();
    session = null;
  });

  ws.on('error', (err) => {
    console.error('[debug ws]', err.message);
    session?.cleanup();
    session = null;
  });
}

module.exports = { handleDebugSocket };
