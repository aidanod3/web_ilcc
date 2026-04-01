/*
 * Editor.jsx — Code editor panel powered by CodeMirror.
 *
 * Creates a CodeMirror 6 EditorView on mount and destroys it on unmount.
 * The editor is styled to match the app's dark theme using CSS variables.
 *
 * Refs:
 *   hostRef — DOM node where CodeMirror mounts its root element.
 *   viewRef — the EditorView instance, kept in a ref so we can access
 *             it imperatively (e.g. to read/set the document contents)
 *             without causing re-renders.
 *
 * TODO: Accept source/setSource props from index.jsx so the parent
 *       can read the editor contents for run/debug, and set them
 *       when loading sample programs or files.
 */

import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import styles from './Editor.module.css';

export default function Editor() {
  const hostRef = useRef(null);   /* DOM element CodeMirror attaches to */
  const viewRef = useRef(null);   /* EditorView instance */

  useEffect(() => {
    /* Create the CodeMirror editor with dark theme overrides */
    const view = new EditorView({
      doc: '',
      extensions: [
        basicSetup,
        EditorView.theme({
          /* Make the editor fill its container */
          '&': { height: '100%', background: 'var(--bg2)' },
          '.cm-scroller': { overflow: 'auto' },
          /* Monospace font for code content */
          '.cm-content': {
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '13px',
          },
          /* Gutter (line numbers) styling */
          '.cm-gutters': {
            background: 'var(--bg2)',
            borderRight: '2px solid var(--border2)',
            color: 'var(--text3)',
          },
          /* Subtle highlight on the active line */
          '.cm-activeLineGutter, .cm-activeLine': {
            background: 'rgba(255, 255, 255, 0.02)',
          },
        }),
      ],
      parent: hostRef.current,
    });

    viewRef.current = view;

    /* Clean up on unmount to prevent memory leaks */
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      {/* CodeMirror mounts its DOM tree inside this div */}
      <div className={styles.editorHost} ref={hostRef} />
    </div>
  );
}
