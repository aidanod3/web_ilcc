/*
 * useRunProgram.js — Hook for running an LCC program to completion.
 *
 * This hook handles the "Run" action: sending the user's assembly code
 * to the server, which assembles and executes it in one shot, then
 * returns the program's stdout output.
 *
 * State:
 *   isRunning — true while the /api/run request is in flight.
 *   output    — the program's output string, or an error message.
 *
 * Methods:
 *   run(code)  — POST the source code to /api/run. Sets isRunning while
 *                waiting, then stores the result in output.
 *   reset()    — Clear all state back to initial values. Called when the
 *                user hits "Stop" or starts a new action.
 *
 * API contract (server/src/routes/run.js):
 *   Request:  { code: string, input?: string }
 *   Response: { output: string } on success, { error: string } on failure.
 */

import { useState, useCallback } from 'react';

export default function useRunProgram() {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');

  const run = useCallback(async (code) => {
    /* Ignore empty submissions */
    if (!code.trim()) return;

    setIsRunning(true);
    setOutput('');

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok) {
        /* Server returned a 4xx/5xx with an error message */
        setOutput(`Error: ${data.error}`);
      } else {
        setOutput(data.output);
      }
    } catch (err) {
      /* Network error or server unreachable */
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setOutput('');
  }, []);

  return { isRunning, output, run, reset };
}
