import { useEffect, useRef, useState } from "react";
import { EditorView, basicSetup } from "codemirror";
import styles from './codeEditor.module.css';

export default function Editor({ source, setSource, onDownload }) {
  const wrapperRef = useRef(null);
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const fileInputRef = useRef(null);
  const [fileLabel, setFileLabel] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const view = new EditorView({
      doc: source,
      extensions: [
        basicSetup,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setSource(view.state.doc.toString());
          }
        })
      ],
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc === source) return;

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: source }
    });
  }, [source]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  async function handleFileImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      setSource(text);
      setFileLabel(file.name);
    } catch {
      setFileLabel('Import failed');
    } finally {
      event.target.value = '';
    }
  }

  async function handleFullscreenToggle() {
    if (!wrapperRef.current) return;

    if (document.fullscreenElement === wrapperRef.current) {
      await document.exitFullscreen();
      return;
    }

    await wrapperRef.current.requestFullscreen();
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.toolbar}>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.importBtn}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            Import
          </button>
          <button
            type="button"
            className={styles.importBtn}
            onClick={onDownload}
          >
            Export
          </button>
          <button
            type="button"
            className={styles.fullscreenBtn}
            onClick={handleFullscreenToggle}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            ⛶
          </button>
        </div>
        <span className={styles.fileLabel}>{fileLabel || 'No file selected'}</span>
      </div>
      <input
        ref={fileInputRef}
        className={styles.hiddenInput}
        type="file"
        accept=".a,.asm,.txt,text/plain"
        onChange={handleFileImport}
      />
      <div className={styles.editorHost} ref={editorRef} />
    </div>
  );
}
