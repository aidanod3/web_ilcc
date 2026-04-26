/*
 * Memory.jsx — Program memory viewer panel.
 *
 * Shows every address in the program area (addr ≤ 0x7fff) that has been
 * written to (or was present at load time via memory_init), sorted ascending.
 *
 * Jump bar: type any hex address, press Enter — scrolls to the exact row
 * if it exists, otherwise to the nearest written address above the target.
 *
 * After each step, automatically scrolls to the first written address that
 * changed, so you always see the effect of a memory write without hunting.
 *
 * Values that changed during the last step are shown as "old > new".
 *
 * Props:
 *   debugState — latest diff from useDebugSession (null before first step).
 *   memoryMap  — { [addr: number]: number } accumulated cell values.
 */

import { useState, useEffect, useRef } from 'react';
import styles from './Memory.module.css';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const hex4 = (v) => (v >>> 0).toString(16).padStart(4, '0');

const PROGRAM_AREA_MAX = 0x7fff;

function parseHex(s) {
  const clean = s.trim().replace(/^0x/i, '');
  const v = parseInt(clean, 16);
  return isNaN(v) ? null : (v & 0xffff);
}

function DiffVal({ change, plain }) {
  if (change && change.old !== change.new) {
    return (
      <>
        <span className={styles.old}>{hex4(change.old)}</span>
        <span className={styles.sep}>&gt;</span>
        <span className={`${styles.value} ${styles.new}`}>{hex4(change.new)}</span>
      </>
    );
  }
  return <span className={styles.value}>{hex4(plain)}</span>;
}

/* ── component ───────────────────────────────────────────────────────────── */

export default function Memory({ debugState, memoryMap = {}, isDebugging = false }) {
  const [jumpInput, setJumpInput] = useState('');
  const rowRefs = useRef({});

  /* Current-step changes, filtered to program area. */
  const changesThisStep = new Map();
  for (const ch of (debugState?.memory ?? [])) {
    if (ch.addr <= PROGRAM_AREA_MAX) {
      changesThisStep.set(ch.addr, ch);
    }
  }

  /* Union of all known program-area addresses, sorted ascending. */
  const addrs = [
    ...new Set([
      ...Object.keys(memoryMap).map(Number).filter(a => a <= PROGRAM_AREA_MAX),
      ...changesThisStep.keys(),
    ]),
  ].sort((a, b) => a - b);

  /* After each step, scroll to the first changed program-area address.
     We try immediately and also schedule a retry via setTimeout(0) because
     setDebugState and setMemoryMap may commit in separate renders: on the
     first commit the new row's ref isn't in the DOM yet, but it will be by
     the time the macro-task fires. */
  useEffect(() => {
    if (!changesThisStep.size) return;
    const firstChanged = [...changesThisStep.keys()].sort((a, b) => a - b)[0];

    function tryScroll() {
      rowRefs.current[firstChanged]?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }

    tryScroll();
    const id = setTimeout(tryScroll, 0);
    return () => clearTimeout(id);
  }, [debugState]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Jump: exact match, or nearest written address >= target. */
  function handleJump(e) {
    if (e.key !== 'Enter') return;
    const target = parseHex(jumpInput);
    if (target === null || addrs.length === 0) return;

    /* Find the first address in the list that is >= target. */
    const dest = addrs.find(a => a >= target) ?? addrs[addrs.length - 1];
    rowRefs.current[dest]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  if (!isDebugging) {
    return (
      <div className={styles.panel}>
        <span className={styles.empty}>No memory writes yet</span>
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
          aria-label="Jump to memory address"
        />
      </div>

      {/* Scrollable content */}
      <div className={styles.content}>

        {/* Sticky column header */}
        <div className={styles.tableHeader}>
          <span className={styles.tagSpacer} />
          <span className={styles.colAddr}>addr</span>
          <span className={styles.colValue}>value</span>
        </div>

        {addrs.length === 0 ? (
          <span className={styles.empty}>No program memory writes yet</span>
        ) : (
          addrs.map(addr => {
            const change = changesThisStep.get(addr);
            const val    = memoryMap[addr] ?? 0;
            return (
              <div
                key={addr}
                ref={el => { rowRefs.current[addr] = el; }}
                className={`${styles.row} ${change ? styles.changed : ''}`}
              >
                <span className={styles.tag} />
                <span className={styles.address}>{hex4(addr)}</span>
                <DiffVal change={change} plain={val} />
              </div>
            );
          })
        )}

      </div>
    </div>
  );
}
