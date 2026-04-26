/*
 * Drawer.jsx — Full-height slide-in panel from the left edge.
 *
 * Rendered at the page root (index.jsx) so it overlays everything including
 * the Header. Uses CSS transitions for the open/close slide animation.
 * Clicking the backdrop closes the drawer.
 *
 * Props:
 *   open    — whether the drawer is visible.
 *   onClose — called when the user clicks outside or the close button.
 */

import { X } from 'lucide-react';
import styles from './Drawer.module.css';

export default function Drawer({ open, onClose }) {
  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ''}`}
        onClick={onClose}
      />

      {/* Sliding panel */}
      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>Problems</span>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        <div className={styles.drawerContent}>
          {/* Problem list will be added here */}
        </div>
      </div>
    </>
  );
}
