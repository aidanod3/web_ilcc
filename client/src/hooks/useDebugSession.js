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
  const [iteration,    setIteration]   = useState(0);
  const [programDone,  setProgramDone] = useState(false);
  const [currentLine,  setCurrentLine] = useState(null);
  const [lastStop,     setLastStop]    = useState(null);   // 'breakpoint' | 'budget' | null after a continue

  /* Sparse map of every memory cell written since the session started.
     Key: address (number), Value: current cell value (number).
     Only grows — never shrinks within a session.  Reset on start/stop. */
  const [memoryMap, setMemoryMap] = useState({});

  /* Live WebSocket — ref so changes don't trigger re-renders. */
  const wsRef = useRef(null);

  /* address → 1-based line number map received from the server at session
     start.  Stored in a ref so lookups don't trigger re-renders. */
  const lineMapRef = useRef({});

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
      /* Null out handlers before closing so the old onclose can't fire
         asynchronously and stomp the new session's isDebugging = true. */
      wsRef.current.onopen    = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror   = null;
      wsRef.current.onclose   = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    /* Reset all state for a fresh session. */
    lineMapRef.current = {};
    setIsDebugging(true);
    setOutput('');
    setInputMode(false);
    setDebugState(null);
    setIteration(0);
    setProgramDone(false);
    setMemoryMap({});
    setCurrentLine(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}${import.meta.env.BASE_URL}api/debug`);
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

        /* Initial program memory sent once after successful assembly. */
        case 'memory_init': {
          const init = {};
          for (const { addr, value } of msg.cells) {
            init[addr] = value;
          }
          setMemoryMap(init);
          break;
        }

        /* Address→line map + initial PC — highlights the entry line before
           the first step is taken. */
        case 'line_map':
          lineMapRef.current = msg.map ?? {};
          setCurrentLine(lineMapRef.current[msg.initialPc] ?? null);
          break;

        /* Server executed a step and returned the state diff. */
        case 'step_result':
          setDebugState(msg.diff);
          setIteration(msg.iteration);
          setLastStop(msg.continued ? (msg.diff.hitBreakpoint ? 'breakpoint' : msg.diff.budgetExhausted ? 'budget' : null) : null);
          /* pc.new is the next instruction to execute — highlight that line. */
          setCurrentLine(lineMapRef.current[msg.diff.pc.new] ?? null);
          /* Merge any memory writes from this step into the running map. */
          if (msg.diff.memory?.length) {
            setMemoryMap(prev => {
              const next = { ...prev };
              for (const ch of msg.diff.memory) {
                next[ch.addr] = ch.new;
              }
              return next;
            });
          }
          break;

        /* Program reached HALT — no more forward steps possible. */
        case 'done':
          setProgramDone(true);
          setCurrentLine(null);
          break;

        /* Assembly or runtime error. */
        case 'error':
          setOutput(prev => prev + `\nError: ${msg.message}`);
          setCurrentLine(null);
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

  /* ── setBreakpoints(lines) / continue() ── */
  const setBreakpoints = useCallback((lines) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'breakpoints', lines }));
    }
  }, []);
  const continueRun = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'continue' }));
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
    lineMapRef.current = {};
    setIsDebugging(false);
    setOutput('');
    setInputMode(false);
    setDebugState(null);
    setIteration(0);
    setProgramDone(false);
    setMemoryMap({});
    setCurrentLine(null);
    setLastStop(null);
  }, []);

  return {
    lastStop,
    setBreakpoints,
    continueRun,
    isDebugging,
    output,
    inputMode,
    debugState,
    iteration,
    programDone,
    memoryMap,
    currentLine,
    start,
    step,
    sendInput,
    stop,
  };
}
