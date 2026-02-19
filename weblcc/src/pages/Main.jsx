import { useMemo, useState } from 'react';

const starterProgram = `; ex0301.a
          ld r0, x
          ld r1, y
          add r0, r0, r1
          dout r0
          nl
          halt
x:        .word 2
y:        .word 3
`;

function normalizeLines(source) {
  return source.replace(/\r\n/g, '\n').split('\n');
}

export default function Main() {
  const [source, setSource] = useState(starterProgram);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [traceSteps, setTraceSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTracing, setIsTracing] = useState(false);
  const [leftTab, setLeftTab] = useState('output');
  const [rightTab, setRightTab] = useState('registers');

  const lines = useMemo(() => normalizeLines(source), [source]);
  const activeStep = traceSteps[currentStep];
  const activeLine = activeStep ? activeStep.lineNumber - 1 : -1;
  const stepCount = traceSteps.length;

  const registers = activeStep?.registers || [
    { name: 'r0', value: '0x0000' },
    { name: 'r1', value: '0x0000' },
    { name: 'r2', value: '0x0000' },
    { name: 'r3', value: '0x0000' },
    { name: 'r4', value: '0x0000' },
    { name: 'r5', value: '0x0000' },
    { name: 'r6', value: '0x4000' },
    { name: 'r7', value: '0x0000' }
  ];

  const flags = activeStep?.flags || { N: 0, Z: 0, P: 0, C: 0, V: 0 };

  const stack = activeStep?.stack || [
    { addr: '0x4000', value: '0x0000' },
    { addr: '0x3fff', value: '0x0000' },
    { addr: '0x3ffe', value: '0x0000' }
  ];

  const eventLabel = activeStep?.action || 'No trace data loaded.';

  const memoryRows = useMemo(() => {
    const rows = [];
    for (let row = 0; row < 6; row += 1) {
      const addr = `0x${(0x4000 + row * 4).toString(16).padStart(4, '0')}`;
      const cells = [];
      for (let col = 0; col < 4; col += 1) {
        const index = row * 4 + col;
        const value = stack[index]?.value || '0x0000';
        cells.push(value);
      }
      rows.push({ addr, cells });
    }
    return rows;
  }, [stack]);

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

  async function handleTrace() {
    setOutput('');
    setIsTracing(true);
    setCurrentStep(0);

    try {
      const response = await fetch('/api/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trace program');
      }

      setTraceSteps(data.steps || []);
      setLeftTab('trace');
    } catch (error) {
      setOutput(String(error));
      setTraceSteps([]);
      setIsTracing(false);
    }
  }

  function handlePrev() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  function handleNext() {
    setCurrentStep((prev) => Math.min(prev + 1, stepCount - 1));
  }

  function handleReset() {
    setTraceSteps([]);
    setCurrentStep(0);
    setIsTracing(false);
  }

  function handleDownload() {
    const blob = new Blob([source], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'program.a';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>LCC Compiler</h1>
          <p>Assembly editor and execution dashboard</p>
        </div>
        <div className="topbar__actions">
          <button className="btn btn--gold" type="button" onClick={handleRun} disabled={isRunning}>
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button className="btn btn--ghost" type="button" onClick={handleTrace}>
            Trace
          </button>
          <button className="btn btn--ghost" type="button" onClick={handlePrev} disabled={stepCount === 0 || currentStep === 0}>
            Step Back
          </button>
          <button className="btn btn--ghost" type="button" onClick={handleNext} disabled={stepCount === 0 || currentStep >= stepCount - 1}>
            Step Forward
          </button>
          <button className="btn btn--ghost" type="button" onClick={handleReset}>
            Reset
          </button>
          <button className="btn btn--outline" type="button" onClick={handleDownload}>
            Download .a
          </button>
        </div>
      </header>

      <div className="layout">
        <div className="panel panel--editor">
          <div className="panel__header">
            <span>Assembly Source</span>
            <span className="panel__meta">Steps: {stepCount || 0}</span>
          </div>
          <div className="panel__body">
            {isTracing ? (
              <div className="code-display">
                {lines.map((line, index) => (
                  <div
                    key={`line-${index}`}
                    className={index === activeLine ? 'code-line is-active' : 'code-line'}
                  >
                    <span className="code-line__number">{index + 1}</span>
                    <span className="code-line__text">{line || ' '}</span>
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                className="editor__textarea"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                spellCheck="false"
              />
            )}
          </div>
        </div>

        <div className="panel panel--output">
          <div className="panel__tabs">
            <button
              type="button"
              className={leftTab === 'output' ? 'tab is-active' : 'tab'}
              onClick={() => setLeftTab('output')}
            >
              Output
            </button>
            <button
              type="button"
              className={leftTab === 'trace' ? 'tab is-active' : 'tab'}
              onClick={() => setLeftTab('trace')}
            >
              Trace
            </button>
          </div>
          <div className="panel__body">
            {leftTab === 'output' ? (
              <pre className="console">{output || 'No output yet...'}</pre>
            ) : (
              <div className="trace-list">
                {traceSteps.length === 0 && (
                  <div className="empty">Run Trace to see steps.</div>
                )}
                {traceSteps.map((step, index) => (
                  <button
                    key={`${step.lineNumber}-${index}`}
                    type="button"
                    className={index === currentStep ? 'trace-item is-active' : 'trace-item'}
                    onClick={() => setCurrentStep(index)}
                  >
                    <span>L{step.lineNumber}</span>
                    <span>{step.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="panel panel--right">
          <div className="panel__tabs">
            <button
              type="button"
              className={rightTab === 'registers' ? 'tab is-active' : 'tab'}
              onClick={() => setRightTab('registers')}
            >
              Registers
            </button>
            <button
              type="button"
              className={rightTab === 'stack' ? 'tab is-active' : 'tab'}
              onClick={() => setRightTab('stack')}
            >
              Stack
            </button>
            <button
              type="button"
              className={rightTab === 'flags' ? 'tab is-active' : 'tab'}
              onClick={() => setRightTab('flags')}
            >
              Flags
            </button>
            <button
              type="button"
              className={rightTab === 'memory' ? 'tab is-active' : 'tab'}
              onClick={() => setRightTab('memory')}
            >
              Memory
            </button>
          </div>
          <div className="panel__body">
            {rightTab === 'registers' ? (
              <div className="register-grid">
                {registers.map((register) => (
                  <div key={register.name} className="register">
                    <span>{register.name.toUpperCase()}</span>
                    <strong>{register.value}</strong>
                  </div>
                ))}
              </div>
            ) : rightTab === 'stack' ? (
              <div className="stack-list">
                {stack.map((item, index) => (
                  <div key={item.addr} className="stack-item">
                    <span>{item.addr}</span>
                    <strong>{item.value}</strong>
                    <span className="stack-index">#{index}</span>
                  </div>
                ))}
                <div className="stack-event">{eventLabel}</div>
              </div>
            ) : rightTab === 'flags' ? (
              <div className="flags-grid">
                {Object.entries(flags).map(([key, value]) => (
                  <div key={key} className="flag-cell">
                    <span>{key}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="memory-grid">
                <div className="memory-row memory-row--head">
                  <span>Addr</span>
                  <span>+0</span>
                  <span>+1</span>
                  <span>+2</span>
                  <span>+3</span>
                </div>
                {memoryRows.map((row) => (
                  <div key={row.addr} className="memory-row">
                    <span>{row.addr}</span>
                    {row.cells.map((cell, index) => (
                      <span key={`${row.addr}-${index}`}>{cell}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
