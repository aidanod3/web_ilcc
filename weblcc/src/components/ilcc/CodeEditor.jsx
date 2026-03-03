import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
// import styles from './codeEditor.module.css';

export default function Editor({ source, setSource }) {
  const editorRef = useRef(null);

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

    return () => view.destroy();
  }, []);

  return <div ref={editorRef} />;
}