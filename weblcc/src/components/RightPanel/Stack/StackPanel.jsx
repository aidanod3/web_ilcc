import styles from './StackPanel.module.css';
import sectionStyles from '../RightPanel.module.css';

export default function StackPanel({ stack, eventLabel }) {
  return (
    <div className={sectionStyles.section}>
      <div className={sectionStyles.sectionHeader}>Stack</div>
      <div className={styles.list}>
        {stack.map((item, index) => (
          <div key={item.addr} className={styles.item}>
            <span>{item.addr}</span>
            <strong>{item.value}</strong>
            <span className={styles.index}>#{index}</span>
          </div>
        ))}
        <div className={styles.event}>{eventLabel}</div>
      </div>
    </div>
  );
}