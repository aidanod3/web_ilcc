/*
 * useRunProgram.js — Hook for running an LCC program to completion.
 *
 * Opens a WebSocket to /api/run, sends the source code, then streams
 * output back in real time. If the program hits a SIN/DIN instruction
 * the server pauses and requests input — this hook surfaces that as
 * inputMode=true so Terminal can show an input field.
 *
 * State:
 *   isRunning  — true from the moment run() is called until the program
 *                finishes or an error occurs.
 *   output     — accumulated text the program has printed so far.
 *   inputMode  — true when the server is waiting for user input (SIN/DIN).
 *
 * Methods:
 *   run(code)        — open WebSocket, send { type:'start', code }.
 *   sendInput(text)  — send { type:'input', text }, clear inputMode.
 *   reset()          — close WebSocket and clear all state.
 *
 * WebSocket protocol:
 *   client → server:  { type: 'start', code }
 *   client → server:  { type: 'input', text }
 *   server → client:  { type: 'output',        text }
 *   server → client:  { type: 'input_request'        }
 *   server → client:  { type: 'error',          message }
 *   server → client:  { type: 'done'                  }
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export default function useRunProgram() {
  const [isRunning,  setIsRunning]  = useState(false);
  const [output,     setOutput]     = useState('');
  const [inputMode,  setInputMode]  = useState(false);

  /* Holds the live WebSocket — not state because changing it should
     never trigger a re-render. */
  const wsRef = useRef(null);

  /* Close any open socket when the component that owns this hook unmounts. */
  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  /* ── run(code) ──────────────────────────────────────────────────────────
     Opens a new WebSocket connection and immediately sends the source code.
     If a previous connection is still open it is closed first. */
  const run = useCallback((code) => {
    if (!code.trim()) return;

    /* Close any lingering connection from a previous run. */
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsRunning(true);
    setOutput('');
    setInputMode(false);

    /* Build the WebSocket URL from the current page origin so it works
       in both local dev (Vite proxy) and Docker (same host). */
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/run`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'start', code }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        /* Program printed something — append to output. */
        case 'output':
          setOutput(prev => prev + msg.text);
          break;

        /* Program hit SIN/DIN with empty buffer — show input field. */
        case 'input_request':
          setInputMode(true);
          break;

        /* Program finished normally. */
        case 'done':
          setIsRunning(false);
          ws.close();
          break;

        /* Assembly or runtime error. */
        case 'error':
          setOutput(prev => prev + `\nError: ${msg.message}`);
          setIsRunning(false);
          ws.close();
          break;
      }
    };

    ws.onerror = () => {
      setOutput(prev => prev + '\nWebSocket error — could not reach server.');
      setIsRunning(false);
    };

    ws.onclose = () => {
      /* Mark not running whenever the socket closes for any reason
         (normal finish, error, or manual reset). */
      setIsRunning(false);
    };
  }, []);

  /* ── sendInput(text) ────────────────────────────────────────────────────
     Called when the user submits text in Terminal's input field.
     Sends the text to the server and clears inputMode so the field hides. */
  const sendInput = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', text }));
      setInputMode(false);
    }
  }, []);

  /* ── reset() ────────────────────────────────────────────────────────────
     Called when the user hits Stop, or before starting a new run. */
  const reset = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsRunning(false);
    setOutput('');
    setInputMode(false);
  }, []);

  return { isRunning, output, inputMode, run, sendInput, reset };
}
