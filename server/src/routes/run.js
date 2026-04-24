/*
 * routes/run.js — WebSocket handler for the run-to-completion workflow.
 *
 * Clients connect to ws://<host>/api/run, then exchange messages:
 *
 *   client → server:
 *     { type: 'start', code }   — send source code to assemble and run
 *     { type: 'input', text }   — provide input when program hits SIN/DIN
 *
 *   server → client:
 *     { type: 'output',        text }    — program printed something
 *     { type: 'input_request'       }    — program needs user input
 *     { type: 'error',     message }     — assembly or runtime error
 *     { type: 'done'                }    — program finished
 *
 * This module exports a function that receives an already-upgraded WebSocket
 * and request object, called from server/index.js on the 'upgrade' event.
 */

const { createRunSession } = require('../services/runner');

function handleRunSocket(ws) {
  let session = null;

  /* Helper: send a typed JSON message to the client. */
  function send(obj) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      send({ type: 'error', message: 'Invalid message format.' });
      return;
    }

    switch (msg.type) {

      /* ── start: assemble + begin running ── */
      case 'start': {
        if (!msg.code || !msg.code.trim()) {
          send({ type: 'error', message: 'No code provided.' });
          return;
        }

        session = createRunSession(msg.code, {
          onOutput:       (text) => send({ type: 'output', text }),
          onInputRequest: ()     => send({ type: 'input_request' }),
          onDone:         ()     => send({ type: 'done' }),
          onError:        (message) => send({ type: 'error', message }),
        });

        if (session) session.start();
        break;
      }

      /* ── input: resume execution after SIN/DIN pause ── */
      case 'input': {
        if (!session) return;
        session.provideInput(msg.text ?? '');
        break;
      }
    }
  });

  /* Clean up temp files if the client disconnects mid-run. */
  ws.on('close', () => {
    session?.cleanup();
    session = null;
  });

  ws.on('error', (err) => {
    console.error('[run ws]', err.message);
    session?.cleanup();
    session = null;
  });
}

module.exports = { handleRunSocket };
