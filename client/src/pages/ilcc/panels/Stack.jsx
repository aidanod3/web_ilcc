/*
 * Stack.jsx — Stack viewer panel.
 *
 * Displays the call stack as a list of address/value rows centered
 * around the current stack pointer. Each row shows:
 *   - The memory address (hex)
 *   - The value stored at that address (hex)
 *   - Optional tags (SP, FP, etc.) when a pointer references that address
 *
 * Changed rows will get the `.changed` CSS class (green highlight)
 * by comparing the previous step's stack values with the current ones.
 *
 * TODO: Accept debug state props so the stack updates on each step.
 *       Currently shows an empty placeholder.
 */

import styles from './Stack.module.css';

export default function Stack() {
  return (
    <div className={styles.content}>
      {/* Placeholder — will be populated with stack rows from the debug session */}
      <div className={styles.empty}>No stack data</div>
    </div>
  );
}
