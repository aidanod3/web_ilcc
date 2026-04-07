/*
 * Terminal.jsx — Output terminal panel.
 *
 * Displays program stdout from run or debug sessions.
 * The output prop is a plain string — we render it in a <pre> block
 * with monospace font to preserve formatting (newlines, spacing).
 */

import styles from './Terminal.module.css';

export default function Terminal({ output }) {
  return (
    <div className={styles.terminal}>
      <pre className={styles.output}>{output || ''}</pre>
    </div>
  );
}
