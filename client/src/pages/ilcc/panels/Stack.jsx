/*
 * Stack.jsx — Stack viewer panel.
 *
 * Will display the call stack as address/value rows
 * once debug state is wired up.
 */

import styles from './Stack.module.css';

export default function Stack() {
  return (
    <div className={styles.content} />
  );
}
