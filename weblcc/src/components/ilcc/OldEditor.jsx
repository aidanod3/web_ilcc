import styles from './CodeEditor.module.css';

export default function CodeEditor({ isTracing, lines, activeLine, source, onSourceChange }) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>Assembly Source</span>
      </div>
      <div className={styles.body}>
        {isTracing ? (
          <div className={styles.codeDisplay}>
            {lines.map((line, index) => (
              <div
                key={`line-${index}`}
                className={index === activeLine ? styles.codeLineActive : styles.codeLine}
              >
                <span className={styles.codeLineNumber}>{index + 1}</span>
                <span>{line || ' '}</span>
              </div>
            ))}
          </div>
        ) : (
          <textarea
            className={styles.textarea}
            value={source}
            onChange={(event) => onSourceChange(event.target.value)}
            spellCheck="false"
          />
        )}
      </div>
    </div>
  );
}