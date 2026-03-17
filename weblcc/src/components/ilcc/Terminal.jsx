import styles from './terminal.module.css';

export default function Terminal({ output, traceInfo, studentMode, onClear }) {
    return (
        <div className={studentMode ? `${styles.terminal} ${styles.studentMode}` : styles.terminal}>
            <div className={styles.topRow}>
                <div className={styles.traceInfo}>{traceInfo}</div>
                <button type="button" className={styles.clearBtn} onClick={onClear} aria-label="Clear terminal">
                    ⌫
                </button>
            </div>
            {studentMode ? <div className={styles.hint}>Green highlights show what changed this step.</div> : null}
            <pre className={styles.output}>{output || 'No output yet...'}</pre>
        </div>
    );
}
