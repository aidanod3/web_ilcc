/*
 * Stack.jsx — Stack memory viewer panel.
 *
 * Shows a window of memory addresses around the current stack pointer (sp = r6),
 * extending up to 0xffff so the bottom of the stack is always visible.
 *
 * Layout per row:   [pointer tag]  [address]  [value]
 *
 * Pointer tags (green, right-aligned):
 *   sp>      — stack pointer (r6) is at this address
 *   fp>      — frame pointer (r5) is at this address
 *   fpsp>    — both fp and sp point here simultaneously
 *
 * Values that changed during the last step are highlighted and shown as
 * "old > new" (red → green), matching the CPU panel style.
 *
 * Props:
 *   debugState — latest diff from useDebugSession (null before first step).
 *   memoryMap  — { [addr: number]: number } accumulated cell values.
 */

import { useEffect, useRef } from 'react';
import styles from './Stack.module.css';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const hex4 = (v) => (v >>> 0).toString(16).padStart(4, '0');

/* Rows shown above sp (context for recently-popped items). */
const ROWS_ABOVE_SP = 16;

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

export default function Stack({ debugState, memoryMap = {} }) {
  const spRowRef = useRef(null);

  const sp = debugState?.registers[6]?.new ?? 0;
  const fp = debugState?.registers[5]?.new ?? 0;

  /* Build a fast lookup for cells that changed THIS step. */
  const changesThisStep = new Map();
  for (const ch of (debugState?.memory ?? [])) {
    changesThisStep.set(ch.addr, ch);
  }

  /* Scroll the sp row into view whenever sp changes. */
  useEffect(() => {
    spRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [sp]);

  if (!debugState || sp === 0) {
    return (
      <div className={styles.content}>
        <span className={styles.empty}>Stack uninitialized</span>
      </div>
    );
  }

  /* Address range: ROWS_ABOVE_SP rows above sp, then every address to 0xffff. */
  const startAddr = Math.max(0, sp - ROWS_ABOVE_SP);

  const rows = [];
  for (let addr = startAddr; addr <= 0xffff; addr++) {
    rows.push(addr);
  }

  return (
    <div className={styles.content}>
      {rows.map(addr => {
        const isSp   = addr === sp;
        const isFp   = addr === fp;
        const tag    = (isSp && isFp) ? 'fpsp>' : isSp ? 'sp>' : isFp ? 'fp>' : '';
        const change = changesThisStep.get(addr);
        const val    = memoryMap[addr] ?? 0;

        return (
          <div
            key={addr}
            ref={isSp ? spRowRef : null}
            className={`${styles.row} ${change ? styles.changed : ''}`}
          >
            <span className={styles.pointerTag}>{tag}</span>
            <span className={styles.address}>{hex4(addr)}</span>
            <DiffVal change={change} plain={val} />
          </div>
        );
      })}
    </div>
  );
}
