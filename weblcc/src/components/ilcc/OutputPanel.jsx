import styles from './OutputPanel.module.css';

export default function OutputPanel({ activeTab, onTabChange, output, traceSteps, currentStep, onSelectStep }) {
  return (
    <div className={styles.panel}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={activeTab === 'output' ? styles.tabActive : styles.tab}
          onClick={() => onTabChange('output')}
        >
          Output
        </button>
        <button
          type="button"
          className={activeTab === 'trace' ? styles.tabActive : styles.tab}
          onClick={() => onTabChange('trace')}
        >
          Trace
        </button>
      </div>
      <div className={styles.body}>
        {activeTab === 'output' ? (
          <pre className={styles.console}>{output || 'No output yet...'}</pre>
        ) : (
          <div className={styles.traceList}>
            {traceSteps.length === 0 && (
              <div className={styles.empty}>Run Trace to see steps.</div>
            )}
            {traceSteps.map((step, index) => (
              <button
                key={`${step.lineNumber}-${index}`}
                type="button"
                className={index === currentStep ? styles.traceItemActive : styles.traceItem}
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