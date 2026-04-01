/* Editor.jsx — Code editor panel.
 * Plain textarea for now. Will be replaced with CodeMirror later.
 * TODO: wire `source`/`setSource` props from parent once state is connected.
 */

import styles from './Editor.module.css';

export default function Editor() {
  return (
    <div className={styles.wrapper}>
      <textarea
        className={styles.textarea}
        placeholder="Enter your assembly code here..."
        spellCheck={false}
      />
    </div>
  );
}
