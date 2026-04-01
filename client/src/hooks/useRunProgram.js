import { useState, useCallback } from 'react';

export default function useRunProgram() {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');

  const run = useCallback(async (code) => {
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
        setOutput(`Error: ${data.error}`);
      } else {
        setOutput(data.output);
      }
    } catch (err) {
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
