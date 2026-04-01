/*
 * Memory.jsx — Memory viewer panel.
 *
 * Displays memory as a scrollable table with 5 columns:
 *   - Address:  the base address for the row (hex, aligned to 4)
 *   - +0 to +3: the four consecutive 16-bit words at that base address
 *
 * The column headers are sticky so they stay visible while scrolling.
 * Changed cells will get the `.changed` CSS class (green highlight)
 * by comparing old vs new values from the debug state diff.
 *
 * The server only sends memory addresses that actually changed on each
 * step (sparse diff), so the frontend will maintain a local memory map
 * and merge diffs into it — only re-rendering affected cells.
 *
 * TODO: Accept debug state props so memory updates on each step.
 *       Currently shows an empty placeholder.
 */

import styles from './Memory.module.css';

export default function Memory() {
  return (
    <div className={styles.content}>

      {/* Sticky column headers */}
      <div className={styles.tableHeader}>
        <span className={styles.colLabel}>Address</span>
        <span className={styles.colLabel}>+0</span>
        <span className={styles.colLabel}>+1</span>
        <span className={styles.colLabel}>+2</span>
        <span className={styles.colLabel}>+3</span>
      </div>

      {/* Placeholder — will be populated with memory rows from the debug session */}
      <div className={styles.empty}>No memory data</div>

    </div>
  );
}
