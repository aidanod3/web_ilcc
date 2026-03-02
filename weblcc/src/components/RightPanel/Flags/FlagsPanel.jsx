import styles from './FlagsPanel.module.css';
import sectionStyles from '../RightPanel.module.css';

export default function FlagsPanel({ flags }) {
  return (
    <div className={sectionStyles.section}>
      <div className={sectionStyles.sectionHeader}>Flags</div>
      <div className={styles.grid}>
        {Object.entries(flags).map(([key, value]) => (
          <div key={key} className={styles.cell}>
            <span>{key}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}