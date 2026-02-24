export default function OutputPanel({ activeTab, onTabChange, output, traceSteps, currentStep, onSelectStep }) {
  return (
    <div className="panel panel--output">
      <div className="panel__tabs">
        <button
          type="button"
          className={activeTab === 'output' ? 'tab is-active' : 'tab'}
          onClick={() => onTabChange('output')}
        >
          Output
        </button>
        <button
          type="button"
          className={activeTab === 'trace' ? 'tab is-active' : 'tab'}
          onClick={() => onTabChange('trace')}
        >
          Trace
        </button>
      </div>
      <div className="panel__body">
        {activeTab === 'output' ? (
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
                onClick={() => onSelectStep(index)}
              >
                <span>L{step.lineNumber}</span>
                <span>{step.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
