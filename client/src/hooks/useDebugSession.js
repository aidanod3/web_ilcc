/*
 * useDebugSession.js — Hook for managing an interactive debug session.
 *
 * Opens a WebSocket to /api/debug, sends the source code to assemble and
 * load, then waits for the user to step through execution. The server
 * keeps the interpreter instance alive for the lifetime of the connection.
 *
 * After each step the server sends a diff of only what changed (registers,
 * flags, PC, IR, and modified memory addresses) — the frontend never needs
 * the full 64K memory on every update.
 *
 * State:
 *   isDebugging  — true while the WebSocket session is active.
 *   output       — accumulated text the program has printed.
 *   inputMode    — true when the program hit SIN/DIN and needs input.
 *   debugState   — latest diff from the server:
 *                  {
 *                    pc:        number,
 *                    ir:        number,
 *                    registers: { r0: number, r2: number, ... },  ← only changed
 *                    flags:     { n: 0, z: 1, ... },              ← only changed
 *                    memory:    [{ addr, value }, ...]            ← only changed
 *                  }
 *   iteration    — how many steps forward have been executed (0 = not started).
 *   programDone  — true once the program executes a HALT/trap 0.
 *
 * Methods:
 *   start(code)      — open WebSocket, send { type:'start', code }.
 *   step(n)          — send { type:'step', n } to step forward n instructions.
 *   sendInput(text)  — send { type:'input', text }, clear inputMode.
 *   stop()           — close WebSocket and reset all state.
 *
 * WebSocket protocol:
 *   client → server:  { type: 'start', code }
 *   client → server:  { type: 'step',  n }
 *   client → server:  { type: 'input', text }
 *   server → client:  { type: 'output',      text }
 *   server → client:  { type: 'input_request'      }
 *   server → client:  { type: 'step_result',  diff, iteration }
 *   server → client:  { type: 'error',        message }
 *   server → client:  { type: 'done'                 }
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export default function useDebugSession() {
  const [isDebugging,  setIsDebugging]  = useState(false);
  const [output,       setOutput]       = useState('');
  const [inputMode,    setInputMode]    = useState(false);
  const [debugState,   setDebugState]   = useState(null);
  const [iteration,   setIteration]   = useState(0);
  const [programDone, setProgramDone] = useState(false);

  /* Live WebSocket — ref so changes don't trigger re-renders. */
  const wsRef = useRef(null);

  /* Close socket on unmount. */
  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  /* ── start(code) ────────────────────────────────────────────────────────
     Opens the WebSocket and sends the source code. The server assembles it,
     loads it into the interpreter, initialises the snapshot log, and then
     waits — it does NOT start executing until the first step command. */
  const start = useCallback((code) => {
    if (!code.trim()) return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    /* Reset all state for a fresh session. */
    setIsDebugging(true);
    setOutput('');
    setInputMode(false);
    setDebugState(null);
    setIteration(0);
    setProgramDone(false);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/debug`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'start', code }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        /* Program printed something during a step. */
        case 'output':
          setOutput(prev => prev + msg.text);
          break;

        /* Program hit SIN/DIN — disable step buttons until input sent. */
        case 'input_request':
          setInputMode(true);
          break;

        /* Server executed a step and returned the state diff. */
        case 'step_result':
          setDebugState(msg.diff);
          setIteration(msg.iteration);
          break;

        /* Program reached HALT — no more forward steps possible. */
        case 'done':
          setProgramDone(true);
          break;

        /* Assembly or runtime error. */
        case 'error':
          setOutput(prev => prev + `\nError: ${msg.message}`);
          break;
      }
    };

    ws.onerror = () => {
      setOutput(prev => prev + '\nWebSocket error — could not reach server.');
      setIsDebugging(false);
    };

    ws.onclose = () => {
      setIsDebugging(false);
    };
  }, []);

  /* ── step(n) ────────────────────────────────────────────────────────────
     Execute n instructions forward. Server responds with step_result. */
  const step = useCallback((n = 1) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'step', n }));
    }
  }, []);

  /* ── sendInput(text) ────────────────────────────────────────────────────
     Provide input to a paused SIN/DIN. After sending, the server does NOT
     auto-resume — it waits for the next step command. */
  const sendInput = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', text }));
      setInputMode(false);
    }
  }, []);

  /* ── stop() ─────────────────────────────────────────────────────────────
     Closes the WebSocket (which destroys the server-side session) and
     resets all local state back to idle. */
  const stop = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsDebugging(false);
    setOutput('');
    setInputMode(false);
    setDebugState(null);
    setIteration(0);
    setProgramDone(false);
  }, []);

  return {
    isDebugging,
    output,
    inputMode,
    debugState,
    iteration,
    programDone,
    start,
    step,
    sendInput,
    stop,
  };
}
