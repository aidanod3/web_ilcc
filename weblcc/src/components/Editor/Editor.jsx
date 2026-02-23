import styles from "./Editor.module.css";

function Editor() {
  return (
    <div className={styles.editor}>
      <div className={styles.header}>code.asm</div>
      <textarea className={styles.textarea} />
    </div>
  );
}

export default Editor;
