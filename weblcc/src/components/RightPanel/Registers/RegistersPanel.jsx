import styles from './RegistersPanel.module.css';
import sectionStyles from '../RightPanel.module.css';

export default function RegistersPanel({ registers }) {
  return (
    <div className={sectionStyles.section}>
      <div className={sectionStyles.sectionHeader}>Registers</div>
      <div className={styles.grid}>
        {registers.map((register) => (
          <div key={register.name} className={styles.register}>
            <span>{register.name.toUpperCase()}</span>
            <strong>{register.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}