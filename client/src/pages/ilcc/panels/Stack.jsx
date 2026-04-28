/*
 * Stack.jsx — Stack memory viewer panel.
 *
 * Shows a window of memory addresses around the current stack pointer (sp = r6),
 * extending up to 0xffff so the bottom of the stack is always visible.
 *
 * Rows are rendered immediately on session start (all zeros) using the top
 * of the stack area (near 0xffff) as the default view when sp is not yet set.
 *
 * Layout per row:   [pointer tag]  [address]  [value]
 *
 * Pointer tags:
 *   sp>   (green) — current stack pointer (r6)
 *   fp>   (green) — current frame pointer (r5)
 *   fpsp> (green) — fp and sp coincide at this address
 *   sp>   (red)   — previous sp location, shown for one step after sp moves
 *   fp>   (red)   — previous fp location, shown for one step after fp moves
 *   fpsp> (red)   — previous location where both fp and sp coincided
 *
 * Values that changed during the last step are highlighted as "old > new".
 *
 * Props:
 *   debugState — latest diff from useDebugSession (null before first step).
 *   memoryMap  — { [addr: number]: number } accumulated cell values.
 */

import { useState, useEffect, useRef } from 'react';
import styles from './Stack.module.css';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const hex4 = (v) => (v >>> 0).toString(16).padStart(4, '0');

const ROWS_ABOVE_SP = 16;

function DiffVal({ change, plain }) {
  if (change && change.old !== change.new) {
    return (
      <span className={styles.diffGroup}>
        <span className={styles.old}>{hex4(change.old)}</span>
        <span className={styles.sep}>&gt;</span>
        <span className={styles.new}>{hex4(change.new)}</span>
      </span>
    );
  }
  return <span className={styles.value}>{hex4(plain)}</span>;
}

function parseHex(s) {
  const clean = s.trim().replace(/^0x/i, '');
  const v = parseInt(clean, 16);
  return isNaN(v) ? null : (v & 0xffff);
}

/* ── component ───────────────────────────────────────────────────────────── */

export default function Stack({ debugState, memoryMap = {}, isDebugging = false }) {
  const [jumpInput, setJumpInput] = useState('');
  const spRowRef = useRef(null);
  const rowRefs  = useRef({});

  const sp    = debugState?.registers[6]?.new ?? 0;
  const spOld = debugState?.registers[6]?.old ?? 0;
  const fp    = debugState?.registers[5]?.new ?? 0;
  const fpOld = debugState?.registers[5]?.old ?? 0;

  /* When sp=0 (not yet set), default the view to the top of the stack area. */
  const displaySp = sp !== 0 ? sp : 0xffff;

  /* Build a fast lookup for cells that changed THIS step. */
  const changesThisStep = new Map();
  for (const ch of (debugState?.memory ?? [])) {
    changesThisStep.set(ch.addr, ch);
  }

  /* Scroll the current sp row into view whenever sp changes. */
  useEffect(() => {
    spRowRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [sp]);

  /* Address range: ROWS_ABOVE_SP rows above displaySp, then every address to 0xffff. */
  const startAddr = Math.max(0, displaySp - ROWS_ABOVE_SP);
  const rows = [];
  for (let addr = startAddr; addr <= 0xffff; addr++) {
    rows.push(addr);
  }

  function handleJump(e) {
    if (e.key !== 'Enter') return;
    const target = parseHex(jumpInput);
    if (target !== null) {
      rowRefs.current[target]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  if (!isDebugging) {
    return (
      <div className={styles.panel}>
        <span className={styles.empty}>No stack data yet</span>
      </div>
    );
  }

  return (
    <div className={styles.panel}>

      {/* Jump-to-address bar */}
      <div className={styles.jumpBar}>
        <span className={styles.jumpLabel}>Jump</span>
        <input
          className={styles.jumpInput}
          type="text"
          placeholder="0xaddr"
          value={jumpInput}
          onChange={e => setJumpInput(e.target.value)}
          onKeyDown={handleJump}
          spellCheck={false}
          aria-label="Jump to stack address"
        />
      </div>

      {/* Scrollable rows — always rendered; all zeros before first step */}
      <div className={styles.content}>

        {/* Sticky column header */}
        <div className={styles.tableHeader}>
          <span className={styles.tagSpacer} />
          <span className={styles.colAddr}>addr</span>
          <span className={styles.colValue}>value</span>
        </div>

        {rows.map(addr => {
          const isSp    = sp    !== 0 && addr === sp;
          const isFp    = fp    !== 0 && addr === fp;
          /* Previous locations — shown in red for one step after the pointer moves. */
          const isOldSp = sp !== 0 && spOld !== 0 && spOld !== sp && addr === spOld;
          const isOldFp = fp !== 0 && fpOld !== 0 && fpOld !== fp && addr === fpOld;

          /* Current-position tags take priority over old-position tags.
             Within old tags, the combined fpsp> label fires when both old
             pointers happened to share the same address. */
          let tag = '', tagClass = styles.pointerTag;
          if      (isSp && isFp)       { tag = 'fpsp>'; }
          else if (isSp)               { tag = 'sp>'; }
          else if (isFp)               { tag = 'fp>'; }
          else if (isOldSp && isOldFp) { tag = 'fpsp>'; tagClass = styles.pointerTagOld; }
          else if (isOldSp)            { tag = 'sp>';   tagClass = styles.pointerTagOld; }
          else if (isOldFp)            { tag = 'fp>';   tagClass = styles.pointerTagOld; }

          const change = changesThisStep.get(addr);
          const val    = memoryMap[addr] ?? 0;

          return (
            <div
              key={addr}
              ref={el => {
                rowRefs.current[addr] = el;
                if (isSp) spRowRef.current = el;
              }}
              className={`${styles.row} ${change ? styles.changed : ''}`}
            >
              <span className={tagClass}>{tag}</span>
              <span className={styles.address}>{hex4(addr)}</span>
              <DiffVal change={change} plain={val} />
            </div>
          );
        })}
      </div>

    </div>
  );
}
