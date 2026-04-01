/* CPU.jsx — CPU state panel.
 * Displays registers (r0-r7), condition codes (C, V, N, Z),
 * and pointers (FP, SP, LR, PC, IR).
 * TODO: wire debug state props once the debugger is connected.
 */

import styles from './CPU.module.css';

/* Static placeholder data — will be replaced with live debug state */
const REGISTERS = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];
const FLAGS = ['C', 'V', 'N', 'Z'];
const POINTERS = ['FP', 'SP', 'LR', 'PC', 'IR'];

export default function CPU() {
  return (
    <div className={styles.content}>

      {/* General-purpose registers */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Registers</span>
        {REGISTERS.map((name) => (
          <div key={name} className={styles.row}>
            <span className={styles.label}>{name}</span>
            <span className={styles.value}>0x0000</span>
          </div>
        ))}
      </div>

      {/* Condition code flags */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Condition Codes</span>
        <div className={styles.flagRow}>
          {FLAGS.map((flag) => (
            <div key={flag} className={styles.flag}>
              <span className={styles.flagLabel}>{flag}</span>
              <span className={styles.flagValue}>0</span>
            </div>
          ))}
        </div>
      </div>

      {/* Named pointers (aliases for registers + PC/IR) */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Pointers</span>
        {POINTERS.map((name) => (
          <div key={name} className={styles.row}>
            <span className={styles.label}>{name}</span>
            <span className={styles.value}>0x0000</span>
          </div>
        ))}
      </div>

    </div>
  );
}
