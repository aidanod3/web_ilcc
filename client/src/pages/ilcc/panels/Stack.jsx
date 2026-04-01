/* Stack.jsx — Stack viewer panel.
 * Displays the call stack as address/value rows.
 * TODO: wire debug state props once the debugger is connected.
 */

import styles from './Stack.module.css';

export default function Stack() {
  return (
    <div className={styles.content}>
      {/* Placeholder — will be populated with stack data from debug session */}
      <div className={styles.empty}>No stack data</div>
    </div>
  );
}
