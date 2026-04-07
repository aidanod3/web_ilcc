/*
 * useDebugSession.js — Hook for managing an interactive debug session.
 *
 * This hook handles the "Debug" action: assembling the user's code on
 * the server, creating a persistent interpreter session, and then
 * stepping forward/backward through execution one instruction at a time.
 *
 * The server keeps the interpreter instance in memory, keyed by a
 * sessionId (UUID). Each step request returns a *diff* of what changed
 * (registers, flags, PC, IR, and only the memory addresses that were
 * modified), so the frontend doesn't need to receive the full 64K
 * memory on every step.
 *
 * State:
 *   isDebugging     — true when a debug session is active.
 *   iteration       — current step number (0 = initial state before
 *                     any instructions have executed).
 *   programRunning  — true if the assembly program hasn't halted yet.
 *                     When false, stepping forward is disabled.
 *   output          — the program's accumulated stdout output.
 *   state           — the latest diff object from stateUpdates(), shaped:
 *                     {
 *                       registers: { old: [r0..r7], new: [r0..r7] },
 *                       pc:        { old, new },
 *                       ir:        { old, new },
 *                       flags:     { old: {c,v,n,z}, new: {c,v,n,z} },
 *                       memory:    { [addr]: { old, new }, ... }
 *                     }
 *
 * Methods:
 *   start(code) — POST to /api/debug/start. Assembles the code, creates
 *                 a session, and returns the initial state (iteration 0).
 *                 If a session already exists, it stops the old one first.
 *   step(count) — POST to /api/debug/step. Steps forward (count > 0) or
 *                 backward (count < 0). Returns the diff between the
 *                 previous and new iteration.
 *   stop()      — POST to /api/debug/stop. Destroys the server-side
 *                 session and resets all local state.
 *
 * The sessionId is stored in a ref (not state) because it's never
 * rendered — it's only used as an identifier in API requests.
 *
 * API contract (server/src/routes/debug.js):
 *   /start  →  Request:  { code, input? }
 *              Response: { sessionId, state, listing, iteration, running }
 *   /step   →  Request:  { sessionId, count }
 *              Response: { state, iteration, running, output }
 *   /stop   →  Request:  { sessionId }
 *              Response: { success: true }
 */

import { useState, useRef, useCallback } from 'react';

export default function useDebugSession() {
  const [isDebugging, setIsDebugging] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [programRunning, setProgramRunning] = useState(true);
  const [output, setOutput] = useState('');
  const [state, setState] = useState(null);

  /* sessionId is a ref because we never render it — it's just an
     opaque key sent to the server to identify this debug session. */
  const sessionIdRef = useRef(null);

  /* ── Start a new debug session ── */
  const start = useCallback(async (code) => {
    if (!code.trim()) return;

    /* If we're already in a session, fire-and-forget a stop for cleanup.
       We don't await it — the new /start will work regardless. */
    if (sessionIdRef.current) {
      fetch('/api/debug/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      }).catch(() => {});
    }

    /* Reset local state before starting */
    setOutput('');
    setState(null);

    try {
      const res = await fetch('/api/debug/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      /* Store the session ID and hydrate state from the response */
      sessionIdRef.current = data.sessionId;
      setIsDebugging(true);
      setIteration(data.iteration);              /* 0 on a fresh session */
      setProgramRunning(data.programRunning);   /* true until HALT trap */
      setState(data.state);                     /* initial state object */
      setOutput('');
    } catch (err) {
      /* Re-throw so the caller (index.jsx) can handle it */
      throw err;
    }
  }, []);

  /* ── Step forward or backward ──
     count > 0: execute N instructions forward (new snapshots are created).
     count < 0: restore N snapshots backward (no new execution). */
  const step = useCallback(async (count) => {
    if (!sessionIdRef.current) return;

    try {
      const res = await fetch('/api/debug/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current, count }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOutput(`Error: ${data.error}`);
        return;
      }

      setIteration(data.iteration);
      setProgramRunning(data.programRunning);
      setState(data.state);          /* state object from this step */
      setOutput(data.output);        /* accumulated program stdout */
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
  }, []);

  /* ── Stop the session and reset everything ── */
  const stop = useCallback(() => {
    /* Fire-and-forget the server cleanup */
    if (sessionIdRef.current) {
      fetch('/api/debug/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      }).catch(() => {});
      sessionIdRef.current = null;
    }

    /* Reset all local state to idle */
    setIsDebugging(false);
    setIteration(0);
    setProgramRunning(true);
    setState(null);
    setOutput('');
  }, []);

  return {
    isDebugging,
    iteration,
    programRunning,
    output,
    state,
    start,
    step,
    stop,
  };
}
