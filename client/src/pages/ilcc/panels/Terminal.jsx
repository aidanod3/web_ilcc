/*
 * Terminal.jsx — Output terminal panel.
 *
 * Displays the program's stdout output from either a run or debug session.
 * Content is shown in a scrollable <pre> block with monospace font.
 *
 * TODO: Accept an `output` prop from index.jsx so it displays real
 *       program output. Currently shows a static placeholder.
 */

import styles from './Terminal.module.css';

export default function Terminal() {
  return (
    <div className={styles.terminal}>
      {/* Scrollable output area — will show program stdout */}
      <pre className={styles.output}>No output yet...</pre>
    </div>
  );
}
