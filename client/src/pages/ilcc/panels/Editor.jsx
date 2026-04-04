/*
 * Editor.jsx — Code editor panel powered by CodeMirror.
 *
 * Exposes the EditorView via useImperativeHandle so the parent can
 * read the document contents on demand (e.g. when Run/Debug is clicked)
 * without syncing on every keystroke.
 *
 * Usage from parent:
 *   const editorRef = useRef();
 *   <Editor ref={editorRef} />
 *   const code = editorRef.current.getCode();
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import styles from './Editor.module.css';

const Editor = forwardRef(function Editor(props, ref) {
  const hostRef = useRef(null);   /* DOM element CodeMirror attaches to */
  const viewRef = useRef(null);   /* EditorView instance */

  /* Expose getCode() to the parent via ref */
  useImperativeHandle(ref, () => ({
    getCode: () => viewRef.current?.state.doc.toString() ?? '',
  }));

  useEffect(() => {
    /* Create the CodeMirror editor with dark theme overrides */
    const view = new EditorView({
      doc: '',
      extensions: [
        basicSetup,
        EditorView.theme({
          /* Make the editor fill its container */
          '&': { height: '100%', background: 'var(--bg1)' },
          '.cm-scroller': { overflow: 'auto' },
          /* Monospace font for code content */
          '.cm-content': {
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '13px',
          },
          /* Gutter (line numbers) styling */
          '.cm-gutters': {
            background: 'var(--bg1)',
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
});

export default Editor;
