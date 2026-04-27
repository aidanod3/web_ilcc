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
import { keymap, Decoration } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';
import styles from './Editor.module.css';

/* ── Debug-line highlight ───────────────────────────────────────────────────
   A StateEffect carries a 1-based line number (or null to clear).
   A StateField maintains the corresponding line decoration.
   Both are defined at module scope so they're stable references. */

const setDebugLine = StateEffect.define();

const debugLineField = StateField.define({
  create: () => Decoration.none,

  update(deco, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setDebugLine)) {
        if (effect.value == null) return Decoration.none;
        try {
          const line = tr.state.doc.line(effect.value);
          return Decoration.set([
            Decoration.line({ class: 'cm-debug-line' }).range(line.from),
          ]);
        } catch {
          return Decoration.none;
        }
      }
    }
    /* Remap positions after document edits so the highlight follows the line. */
    return deco.map(tr.changes);
  },

  provide: f => EditorView.decorations.from(f),
});

const Editor = forwardRef(function Editor(props, ref) {
  const hostRef = useRef(null);   /* DOM element CodeMirror attaches to */
  const viewRef = useRef(null);   /* EditorView instance */

  /* Expose methods to the parent via ref */
  useImperativeHandle(ref, () => ({
    getCode: () => viewRef.current?.state.doc.toString() ?? '',

    /* Replace the entire editor document — used when switching tabs. */
    setCode: (content) => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content ?? '' },
      });
    },

    /* Highlight the given 1-based line number and scroll it into view. */
    highlightLine: (lineNum) => {
      const view = viewRef.current;
      if (!view || lineNum == null) return;
      try {
        const line = view.state.doc.line(lineNum);
        view.dispatch({
          effects: [
            setDebugLine.of(lineNum),
            EditorView.scrollIntoView(line.from, { y: 'center' }),
          ],
        });
      } catch { /* line number out of range — ignore */ }
    },

    /* Remove the debug-line highlight. */
    clearHighlight: () => {
      viewRef.current?.dispatch({ effects: setDebugLine.of(null) });
    },
  }));

  useEffect(() => {
    /* Create the CodeMirror editor with dark theme overrides */
    const view = new EditorView({
      doc: '',
      extensions: [
        basicSetup,
        debugLineField,
        keymap.of([{
          key: 'Tab',
          run: (view) => {
            view.dispatch(view.state.replaceSelection('\t'));
            return true;
          },
        }]),
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
          /* Subtle highlight on the active (cursor) line */
          '.cm-activeLineGutter, .cm-activeLine': {
            background: 'rgba(255, 255, 255, 0.02)',
          },
          /* Debug execution pointer — the next line to execute */
          '.cm-debug-line': {
            background: 'var(--debug-line)',
          },
          '.cm-debug-line.cm-activeLine': {
            background: 'var(--debug-line)',
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
