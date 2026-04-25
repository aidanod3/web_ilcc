/*
 * Memory.jsx — Program memory viewer panel.
 *
 * Shows every address in the program area (addr ≤ 0x7fff) that has been
 * written to since the debug session started, in ascending address order.
 * Addresses that have never been written are omitted to keep the list short.
 *
 * Values that changed during the last step are highlighted and shown as
 * "old > new" (red → green), matching the CPU and Stack panel style.
 *
 * Props:
 *   debugState — latest diff from useDebugSession (null before first step).
 *   memoryMap  — { [addr: number]: number } accumulated cell values.
 */

import styles from './Memory.module.css';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const hex4 = (v) => (v >>> 0).toString(16).padStart(4, '0');

/*
 * Addresses at or below this boundary are considered "program memory".
 * The LCC stack lives near 0xffff and grows downward; program code/data
 * is loaded at 0x3000 and grows upward.  0x7fff keeps both sides separate.
 */
const PROGRAM_AREA_MAX = 0x7fff;

function DiffVal({ change, plain }) {
  if (change && change.old !== change.new) {
    return (
      <span className={styles.value}>
        <span className={styles.old}>{hex4(change.old)}</span>
        <span className={styles.sep}>&gt;</span>
        <span className={styles.new}>{hex4(change.new)}</span>
      </span>
    );
  }
  return <span className={styles.value}>{hex4(plain)}</span>;
}

/* ── component ───────────────────────────────────────────────────────────── */

export default function Memory({ debugState, memoryMap = {} }) {
  /* Current-step changes, filtered to the program area. */
  const changesThisStep = new Map();
  for (const ch of (debugState?.memory ?? [])) {
    if (ch.addr <= PROGRAM_AREA_MAX) {
      changesThisStep.set(ch.addr, ch);
    }
  }

  /*
   * Union of:
   *   - Addresses already in memoryMap (written in any prior step)
   *   - Addresses changed this step (in case memoryMap hasn't merged yet)
   * Filtered to program area, sorted ascending.
   */
  const addrs = [
    ...new Set([
      ...Object.keys(memoryMap).map(Number).filter(a => a <= PROGRAM_AREA_MAX),
      ...changesThisStep.keys(),
    ]),
  ].sort((a, b) => a - b);

  if (addrs.length === 0) {
    return (
      <div className={styles.content}>
        <span className={styles.empty}>No program memory writes yet</span>
      </div>
    );
  }

  return (
    <div className={styles.content}>

      {/* Sticky header */}
      <div className={styles.tableHeader}>
        <span className={styles.colLabel}>Addr</span>
        <span className={styles.colLabel}>Value</span>
      </div>

      {addrs.map(addr => {
        const change = changesThisStep.get(addr);
        const val    = memoryMap[addr] ?? 0;
        return (
          <div
            key={addr}
            className={`${styles.row} ${change ? styles.changed : ''}`}
          >
            <span className={styles.address}>{hex4(addr)}</span>
            <DiffVal change={change} plain={val} />
          </div>
        );
      })}

    </div>
  );
}
