import { useState } from 'react';

const starterProgram = `; WebLCC starter program
.start x3000

    lea r0, msg
    trap x22
    halt

msg .stringz "Hello, Team Charlie!"
.end
`;

export default function Main() {
  const [source, setSource] = useState(starterProgram);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');

  async function handleRun() {
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

  return (
    <main className="page">
      <header className="page__header">
        <h1>LCC</h1>
        <p>Run ILCC assembly against the emulator.</p>
      </header>

      <section className="panel">
        <label className="panel__label" htmlFor="source">
          Code
        </label>
        <textarea
          id="source"
          className="panel__textarea"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          spellCheck="false"
        />
        <div className="panel__actions">
          <button type="button" onClick={handleRun} disabled={isRunning}>
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>
      </section>

      <section className="panel">
        <label className="panel__label" htmlFor="output">
          Output
        </label>
        <pre id="output" className="panel__output">
          {output}
        </pre>
      </section>
    </main>
  );
}
