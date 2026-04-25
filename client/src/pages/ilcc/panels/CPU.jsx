/*
 * CPU.jsx — CPU state panel.
 *
 * Displays three sections that together reflect the full architectural state
 * of the LCC processor after the most recent debug step:
 *
 *   Registers  — r0 … r7  (general-purpose)
 *   Flags      — N  Z  C  V  (condition codes)
 *   Pointers   — fp (r5), sp (r6), lr (r7), pc, ir
 *
 * Each field receives an {old, new} pair from the server diff.  When old ≠ new
 * the row is highlighted and the value is rendered as "old > new", matching
 * the screenshot style (old in red, new in green).
 *
 * All numbers are formatted as 4-digit lowercase hex.
 *
 * Props:
 *   debugState — latest diff from useDebugSession, or null before first step.
 *     {
 *       pc:        { old: number, new: number },
 *       ir:        { old: number, new: number },
 *       registers: [ { old, new }, … ],   // 8 entries
 *       flags:     { n, z, c, v }          // each { old, new }
 *     }
 */

import styles from './CPU.module.css';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const hex4 = (v) => (v >>> 0).toString(16).padStart(4, '0');

/* Renders "old > new" when the value changed, otherwise just the current value. */
function DiffValue({ entry }) {
  if (!entry) return <span className={styles.value}>0000</span>;
  const { old: o, new: n } = entry;
  if (o === n) {
    return <span className={styles.value}>{hex4(n)}</span>;
  }
  return (
    <span>
      <span className={styles.old}>{hex4(o)}</span>
      <span className={styles.sep}>&gt;</span>
      <span className={styles.new}>{hex4(n)}</span>
    </span>
  );
}

/* A single label : value row, highlighted if the value changed. */
function Row({ label, entry }) {
  const changed = entry && entry.old !== entry.new;
  return (
    <div className={`${styles.row} ${changed ? styles.changed : ''}`}>
      <span className={styles.label}>{label}:</span>
      <DiffValue entry={entry} />
    </div>
  );
}

/* ── placeholder shown before the first step ─────────────────────────────── */

const ZERO_ENTRY = { old: 0, new: 0 };

function EmptyState() {
  return (
    <div className={styles.content}>
      <div className={styles.section}>
        {Array.from({ length: 8 }, (_, i) => (
          <Row key={i} label={`r${i}`} entry={ZERO_ENTRY} />
        ))}
      </div>

      <div className={styles.flagRow}>
        {['N', 'Z', 'C', 'V'].map((f) => (
          <div key={f} className={styles.flag}>
            <span className={styles.flagLabel}>{f}</span>
            <span className={styles.flagValue}>0</span>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        {['fp', 'sp', 'lr', 'pc', 'ir'].map((label) => (
          <Row key={label} label={label} entry={ZERO_ENTRY} />
        ))}
      </div>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────────── */

export default function CPU({ debugState }) {
  if (!debugState) return <EmptyState />;

  const { registers, flags, pc, ir } = debugState;

  /*
   * Pointers section reuses the register diff entries for fp/sp/lr so the
   * highlight logic is consistent (same underlying register).
   *   fp = r5,  sp = r6,  lr = r7
   */
  const pointers = [
    { label: 'fp', entry: registers[5] },
    { label: 'sp', entry: registers[6] },
    { label: 'lr', entry: registers[7] },
    { label: 'pc', entry: pc },
    { label: 'ir', entry: ir },
  ];

  return (
    <div className={styles.content}>

      {/* ── Registers r0 – r7 ── */}
      {/* Key includes entry.new so React remounts the element whenever the
          value changes, restarting the CSS flash animation from scratch. */}
      <div className={styles.section}>
        {registers.map((entry, i) => (
          <Row key={`r${i}:${entry.new}`} label={`r${i}`} entry={entry} />
        ))}
      </div>

      {/* ── Condition flags: N Z C V ── */}
      <div className={styles.flagRow}>
        {['n', 'z', 'c', 'v'].map((f) => {
          const entry = flags[f];
          const changed = entry.old !== entry.new;
          return (
            <div
              key={`${f}:${entry.new}`}
              className={`${styles.flag} ${changed ? styles.changed : ''}`}
            >
              <span className={styles.flagLabel}>{f.toUpperCase()}</span>
              <span className={styles.flagValue}>{entry.new}</span>
            </div>
          );
        })}
      </div>

      {/* ── Named pointers: fp sp lr pc ir ── */}
      <div className={styles.section}>
        {pointers.map(({ label, entry }) => (
          <Row key={`${label}:${entry.new}`} label={label} entry={entry} />
        ))}
      </div>

    </div>
  );
}
