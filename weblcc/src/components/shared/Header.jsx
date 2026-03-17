import styles from './Header.module.css';

export default function Header({
  isRunning,
  isTracing,
  stepCount,
  onRun,
  onTrace,
  onPrev,
  onNext,
  onReset,
  canStepBack,
  canStepForward,
  samplePrograms,
  selectedSample,
  onSampleChange
}) {
  return (
    <header className={styles.header}>
      <div>
        <h1>&lt;lcc&gt;</h1>
      </div>
      <div className={styles.actions}>
        <select
          className={styles.sampleSelect}
          value={selectedSample}
          onChange={(event) => onSampleChange(event.target.value)}
          aria-label="Load sample program"
        >
          {samplePrograms.map((program) => (
            <option key={program.id} value={program.id}>
              {program.label}
            </option>
          ))}
        </select>
        <button className={styles.btnGold} type="button" onClick={onRun} disabled={isRunning}>
          {isRunning ? 'Running...' : 'Run'}
        </button>
        <button className={styles.btnGhost} type="button" onClick={onTrace} disabled={isRunning}>
          {isTracing ? 'Restart Trace' : 'Trace'}
        </button>
        <button className={styles.btnGhost} type="button" onClick={onPrev} disabled={!canStepBack}>
          Step Back
        </button>
        <button className={styles.btnGhost} type="button" onClick={onNext} disabled={!canStepForward}>
          Step Forward
        </button>
        <button className={styles.btnGhost} type="button" onClick={onReset} disabled={!isTracing}>
          Reset
        </button>
      </div>
      <div className={styles.meta}>Trace Steps: {stepCount || 0}</div>
    </header>
  );
}
