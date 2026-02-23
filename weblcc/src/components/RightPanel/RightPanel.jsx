import styles from "./RightPanel.module.css";

function RightPanel() {
  return (
    <div className={styles.panel}>
      <h3>Registers</h3>
      <div className={styles.section}>
        <div>r0: 0</div>
        <div>r1: 0</div>
        <div>r2: 0</div>
      </div>

      <h3>Flags</h3>
      <div className={styles.section}>
        <div>Z: 0</div>
        <div>N: 0</div>
      </div>
    </div>
  );
}

export default RightPanel;
