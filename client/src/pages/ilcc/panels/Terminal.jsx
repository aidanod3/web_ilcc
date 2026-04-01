/* Terminal.jsx — Output terminal panel.
 * Displays program output from run or debug sessions.
 * TODO: wire `output` prop from parent once state is connected.
 */

import styles from './Terminal.module.css';

export default function Terminal() {
  return (
    <div className={styles.terminal}>
      <pre className={styles.output}>No output yet...</pre>
    </div>
  );
}
