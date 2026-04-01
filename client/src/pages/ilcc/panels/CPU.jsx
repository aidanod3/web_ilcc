/*
 * CPU.jsx — CPU state panel.
 *
 * Displays three groups of processor state:
 *
 *   1. Registers  — General-purpose registers R0 through R7.
 *      Each shows a label and a hex value (e.g. "R0  0x0000").
 *
 *   2. Condition Codes — The four flags: C (carry), V (overflow),
 *      N (negative), Z (zero). Displayed as a horizontal row of
 *      label/value pairs.
 *
 *   3. Pointers — Named aliases for special registers and state:
 *      FP (r5), SP (r6), LR (r7), PC (program counter), IR (instruction register).
 *
 * When debug state is wired up, changed values will get the `.changed`
 * CSS class (green highlight) by comparing old vs new from the diff.
 *
 * TODO: Accept debug state props so values update on each step.
 *       Currently renders static placeholder "0x0000" / "0" values.
 */

import styles from './CPU.module.css';

/* Labels for the three sections — these never change */
const REGISTERS = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];
const FLAGS = ['C', 'V', 'N', 'Z'];
const POINTERS = ['FP', 'SP', 'LR', 'PC', 'IR'];

export default function CPU() {
  return (
    <div className={styles.content}>

      {/* ── General-purpose registers ── */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Registers</span>
        {REGISTERS.map((name) => (
          <div key={name} className={styles.row}>
            <span className={styles.label}>{name}</span>
            <span className={styles.value}>0x0000</span>
          </div>
        ))}
      </div>

      {/* ── Condition code flags ── */}
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

      {/* ── Named pointers (register aliases + PC/IR) ── */}
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
