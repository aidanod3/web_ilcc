import { useState } from 'react';

export function useRunProgram() {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');

  async function handleRun(source) {
    setIsRunning(true);
    setOutput('');

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run program');
      }

      const combined = [data.stdout, data.stderr].filter(Boolean).join('\n');
      setOutput(combined || 'Program finished with no output.');
    } catch (error) {
      setOutput(String(error));
    } finally {
      setIsRunning(false);
    }
  }

  function clearOutput() {
    setOutput('');
  }

  return { isRunning, output, setOutput, handleRun, clearOutput };
}
