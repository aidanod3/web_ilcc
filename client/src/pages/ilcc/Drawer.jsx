/*
 * Drawer.jsx — Full-height slide-in "Problems" panel from the left edge.
 *
 * Rendered at the page root (index.jsx) so it overlays everything including
 * the Header. Clicking the backdrop closes it.
 *
 * Props:
 *   open        — whether the drawer is visible.
 *   onClose     — called when the user clicks outside or the close button.
 *   problems    — [{ line: number|null, message: string }]
 *   onGoToLine  — (line) => void; called when a problem with a line is clicked.
 */

import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import styles from './Drawer.module.css';

export default function Drawer({ open, onClose, problems = [], onGoToLine }) {
  return (
    <>
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        onClick={onClose}
      />

      <aside
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        aria-label="Problems"
        aria-hidden={!open}
      >
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>
            Problems{problems.length ? ` (${problems.length})` : ''}
          </span>
          <button className={styles.closeBtn} onClick={onClose} title="Close" aria-label="Close problems">
            <X size={16} />
          </button>
        </div>

        <div className={styles.drawerContent}>
          {problems.length === 0 ? (
            <div className={styles.empty}>
              <CheckCircle2 size={16} /> No problems. Run or Debug to check your program.
            </div>
          ) : (
            <ul className={styles.list}>
              {problems.map((p, i) => (
                <li key={i} className={styles.item}>
                  <button
                    type="button"
                    className={styles.itemBtn}
                    onClick={() => p.line != null && onGoToLine?.(p.line)}
                    disabled={p.line == null}
                    title={p.line != null ? `Go to line ${p.line}` : undefined}
                  >
                    <AlertCircle size={14} className={styles.itemIcon} />
                    {p.line != null && <span className={styles.itemLine}>L{p.line}</span>}
                    <span className={styles.itemMsg}>{p.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
