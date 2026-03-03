import styles from './Header.module.css';

export default function Header({ isRunning, onRun}) {
  return (
    <header className={styles.header}>
      <div>
        <h1>&lt;lcc&gt;</h1>
      </div>
      <div className={styles.actions}>
        <button className={styles.btnGold} type="button" onClick={onRun} disabled={isRunning}>
          {isRunning ? 'Running...' : 'Run'}
        </button>
        {/* <button className={styles.btnGhost} type="button" onClick={onTrace}>
          Trace
        </button>
        <button className={styles.btnGhost} type="button" onClick={onPrev} disabled={!canStepBack}>
          Step Back
        </button>
        <button className={styles.btnGhost} type="button" onClick={onNext} disabled={!canStepForward}>
          Step Forward
        </button> */}
        {/* <button className={styles.btnGhost} type="button" onClick={onReset}>
          Reset
        </button>
        <button className={styles.btnOutline} type="button" onClick={onDownload}>
          Download .a
        </button> */}
      </div>
      {/* <div className={styles.meta}>Steps: {stepCount || 0}</div> */}
    </header>
  );
}