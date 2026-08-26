/*
 * useShortcuts — app-level keyboard shortcuts.
 *   Mod+Enter run · F5 debug · F10 step · F8 continue · Esc stop
 * Ignored while typing in inputs/textareas (the CodeMirror editor is fine —
 * these are also registered in its keymap so they work there too).
 */
import { useEffect } from 'react';

export const SHORTCUTS = [
  { keys: 'Ctrl/⌘ + Enter', action: 'Run' },
  { keys: 'F5', action: 'Debug' },
  { keys: 'F10', action: 'Step' },
  { keys: 'F8', action: 'Continue to breakpoint' },
  { keys: 'Esc', action: 'Stop' },
];

export default function useShortcuts({ onRun, onDebug, onStep, onContinue, onStop, enabled = true }) {
  useEffect(() => {
    if (!enabled) return;
    const h = (e) => {
      const tag = e.target?.tagName;
      const typing = (tag === 'INPUT' || tag === 'TEXTAREA') && !e.target.closest('.cm-editor');
      if (typing && e.key !== 'Escape') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onRun?.(); }
      else if (e.key === 'F5')  { e.preventDefault(); onDebug?.(); }
      else if (e.key === 'F10') { e.preventDefault(); onStep?.(); }
      else if (e.key === 'F8')  { e.preventDefault(); onContinue?.(); }
      else if (e.key === 'Escape') { onStop?.(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onRun, onDebug, onStep, onContinue, onStop, enabled]);
}
