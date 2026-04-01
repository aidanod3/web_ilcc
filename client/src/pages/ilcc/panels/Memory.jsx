/* Memory.jsx — Memory viewer panel.
 * Displays memory as a table: base address + 4 offset columns.
 * TODO: wire debug state props once the debugger is connected.
 */

import styles from './Memory.module.css';

export default function Memory() {
  return (
    <div className={styles.content}>

      {/* Column headers */}
      <div className={styles.tableHeader}>
        <span className={styles.colLabel}>Address</span>
        <span className={styles.colLabel}>+0</span>
        <span className={styles.colLabel}>+1</span>
        <span className={styles.colLabel}>+2</span>
        <span className={styles.colLabel}>+3</span>
      </div>

      {/* Placeholder — will be populated with memory rows from debug session */}
      <div className={styles.empty}>No memory data</div>

    </div>
  );
}
