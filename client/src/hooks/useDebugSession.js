import { useState, useRef, useCallback } from 'react';

export default function useDebugSession() {
  const [isDebugging, setIsDebugging] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [programRunning, setProgramRunning] = useState(true);
  const [output, setOutput] = useState('');
  const [state, setState] = useState(null);

  const sessionIdRef = useRef(null);

  const start = useCallback(async (code) => {
    if (!code.trim()) return;

    // If already debugging, stop the old session first
    if (sessionIdRef.current) {
      fetch('/api/debug/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      }).catch(() => {});
    }

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

      sessionIdRef.current = data.sessionId;
      setIsDebugging(true);
      setIteration(data.iteration);
      setProgramRunning(data.running);
      setState(data.state);
      setOutput('');
    } catch (err) {
      throw err;
    }
  }, []);

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
      setProgramRunning(data.running);
      setState(data.state);
      setOutput(data.output);
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
  }, []);

  const stop = useCallback(() => {
    if (sessionIdRef.current) {
      fetch('/api/debug/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      }).catch(() => {});
      sessionIdRef.current = null;
    }

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
