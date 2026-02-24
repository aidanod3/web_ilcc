export default function Topbar({ isRunning, stepCount, onRun, onTrace, onPrev, onNext, onReset, onDownload, canStepBack, canStepForward }) {
  return (
    <header className="topbar">
      <div>
        <h1>LCC Compiler</h1>
        <p>Assembly Dashboard</p>
      </div>
      <div className="topbar__actions">
        <button className="btn btn--gold" type="button" onClick={onRun} disabled={isRunning}>
          {isRunning ? 'Running...' : 'Run'}
        </button>
        <button className="btn btn--ghost" type="button" onClick={onTrace}>
          Trace
        </button>
        <button className="btn btn--ghost" type="button" onClick={onPrev} disabled={!canStepBack}>
          Step Back
        </button>
        <button className="btn btn--ghost" type="button" onClick={onNext} disabled={!canStepForward}>
          Step Forward
        </button>
        <button className="btn btn--ghost" type="button" onClick={onReset}>
          Reset
        </button>
        <button className="btn btn--outline" type="button" onClick={onDownload}>
          Download .a
        </button>
      </div>
      <div className="topbar__meta">Steps: {stepCount || 0}</div>
    </header>
  );
}
