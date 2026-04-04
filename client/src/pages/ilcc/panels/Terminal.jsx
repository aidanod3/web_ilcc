/*
 * Terminal.jsx — Output terminal panel.
 *
 * Will display program stdout output from run or debug sessions
 * once state is wired up.
 */

import styles from './Terminal.module.css';

export default function Terminal() {
  return (
    <div className={styles.terminal} />
  );
}
