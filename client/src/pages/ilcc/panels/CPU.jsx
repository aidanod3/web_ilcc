/*
 * CPU.jsx — CPU state panel.
 *
 * Two sections:
 *   Registers — r0…r7, then fp (r5), sp (r6), lr (r7), pc, ir
 *   Flags     — N Z C V shown inline as "N: 0  Z: 0  C: 0  V: 0"
 *
 * Each field receives an {old, new} pair from the server diff. When
 * old ≠ new the row / flag value is highlighted (old in red, new in green).
 *
 * Props:
 *   debugState — latest diff from useDebugSession, or null before first step.
 */

import styles from './CPU.module.css';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const hex4 = (v) => (v >>> 0).toString(16).padStart(4, '0');

/* Renders "old > new" when changed, otherwise just the current value. */
function DiffValue({ entry }) {
  if (!entry) return <span className={styles.value}>0000</span>;
  const { old: o, new: n } = entry;
  if (o === n) return <span className={styles.value}>{hex4(n)}</span>;
  return (
    <span>
      <span className={styles.old}>{hex4(o)}</span>
      <span className={styles.sep}>&gt;</span>
      <span className={styles.new}>{hex4(n)}</span>
    </span>
  );
}

/* A single label : value row, highlighted + keyed on new value so the
   flash animation restarts whenever the value changes. */
function Row({ label, entry }) {
  const changed = entry && entry.old !== entry.new;
  return (
    <div className={`${styles.row} ${changed ? styles.changed : ''}`}>
      <span className={styles.label}>{label}:</span>
      <DiffValue entry={entry} />
    </div>
  );
}

/* ── empty state (before first step) ────────────────────────────────────── */

const ZERO = { old: 0, new: 0 };
const ZERO_FLAG = { old: 0, new: 0 };

function EmptyState() {
  return (
    <div className={styles.content}>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Registers</div>
        {Array.from({ length: 8 }, (_, i) => (
          <Row key={i} label={`r${i}`} entry={ZERO} />
        ))}
        <div className={styles.divider} />
        {[['fp', ZERO], ['sp', ZERO], ['lr', ZERO], ['pc', ZERO], ['ir', ZERO]].map(([label, entry]) => (
          <Row key={label} label={label} entry={entry} />
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Flags</div>
        <div className={styles.flagLine}>
          {['N', 'Z', 'C', 'V'].map(f => (
            <span key={f} className={styles.flagItem}>
              <span className={styles.flagName}>{f}:</span>
              <span className={styles.flagVal}>0</span>
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────────── */

export default function CPU({ debugState }) {
  if (!debugState) return <EmptyState />;

  const { registers, flags, pc, ir } = debugState;

  const pointers = [
    { label: 'fp', entry: registers[5] },
    { label: 'sp', entry: registers[6] },
    { label: 'lr', entry: registers[7] },
    { label: 'pc', entry: pc },
    { label: 'ir', entry: ir },
  ];

  return (
    <div className={styles.content}>

      {/* ── Registers: r0–r7 then named aliases + pc/ir ── */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Registers</div>

        {registers.map((entry, i) => (
          <Row key={`r${i}:${entry.new}`} label={`r${i}`} entry={entry} />
        ))}

        <div className={styles.divider} />

        {pointers.map(({ label, entry }) => (
          <Row key={`${label}:${entry.new}`} label={label} entry={entry} />
        ))}
      </div>

      {/* ── Flags: N Z C V inline ── */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Flags</div>
        <div className={styles.flagLine}>
          {['n', 'z', 'c', 'v'].map((f) => {
            const entry   = flags[f];
            const changed = entry.old !== entry.new;
            return (
              <span
                key={`${f}:${entry.new}`}
                className={`${styles.flagItem} ${changed ? styles.changed : ''}`}
              >
                <span className={styles.flagName}>{f.toUpperCase()}:</span>
                <span className={changed ? styles.new : styles.flagVal}>{entry.new}</span>
              </span>
            );
          })}
        </div>
      </div>

    </div>
  );
}
