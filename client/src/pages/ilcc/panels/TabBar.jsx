/*
 * TabBar.jsx — Editor tab strip.
 *
 * Renders one tab per open file. The active tab is highlighted.
 * Double-clicking a tab name allows inline renaming.
 * A "+" button appends a new untitled tab.
 * The close button (×) is hidden when only one tab is open.
 *
 * Props:
 *   tabs      — [{ id, name }]
 *   activeId  — id of the currently selected tab
 *   onSwitch(id)        — user clicked a tab
 *   onNew()             — user clicked "+"
 *   onClose(id)         — user clicked "×" on a tab
 *   onRename(id, name)  — user committed a new name
 */

import { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import styles from './TabBar.module.css';

export default function TabBar({ tabs, activeId, onSwitch, onNew, onClose, onRename }) {
  /* id of the tab currently being renamed, or null */
  const [editingId,   setEditingId]   = useState(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef(null);

  /* Auto-focus and select-all when the rename input appears */
  useEffect(() => {
    if (editingId != null) {
      inputRef.current?.select();
    }
  }, [editingId]);

  function startRename(id, name, e) {
    e.stopPropagation();
    setEditingId(id);
    setEditingName(name);
  }

  function commitRename() {
    if (editingId != null) {
      const trimmed = editingName.trim();
      if (trimmed) onRename(editingId, trimmed);
    }
    setEditingId(null);
  }

  function handleRenameKey(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { setEditingId(null); }
  }

  return (
    <div className={styles.tabBar}>

      {/* Scrollable tab list */}
      <div className={styles.tabs}>
        {tabs.map(tab => {
          const isActive   = tab.id === activeId;
          const isEditing  = tab.id === editingId;

          return (
            <div
              key={tab.id}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              onClick={() => onSwitch(tab.id)}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  className={styles.renameInput}
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleRenameKey}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  <span
                    className={styles.tabName}
                    onDoubleClick={(e) => startRename(tab.id, tab.name, e)}
                    title={tab.name}
                  >
                    {tab.name}
                  </span>
                  <button
                    className={styles.renameBtn}
                    onClick={e => startRename(tab.id, tab.name, e)}
                    aria-label={`Rename ${tab.name}`}
                    tabIndex={-1}
                  >
                    <Pencil size={10} />
                  </button>
                </>
              )}

              {tabs.length > 1 && (
                <button
                  className={styles.closeBtn}
                  onClick={e => { e.stopPropagation(); onClose(tab.id); }}
                  aria-label={`Close ${tab.name}`}
                  tabIndex={-1}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New tab button */}
      <button
        className={styles.newTabBtn}
        onClick={onNew}
        aria-label="New tab"
        title="New tab"
      >
        +
      </button>

    </div>
  );
}
