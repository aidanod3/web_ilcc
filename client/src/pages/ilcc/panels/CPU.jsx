/*
 * CPU.jsx — CPU state panel.
 *
 * Will display registers (R0-R7), condition codes (C, V, N, Z),
 * and pointers (FP, SP, LR, PC, IR) once debug state is wired up.
 */

import styles from './CPU.module.css';

export default function CPU() {
  return (
    <div className={styles.content} />
  );
}
