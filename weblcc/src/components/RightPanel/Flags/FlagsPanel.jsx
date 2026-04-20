import styles from './FlagsPanel.module.css';
import sectionStyles from '../RightPanel.module.css';

export default function FlagsPanel({ flags }) {
    // Define exactly which flags to show, and in what order
    const standardFlags = ['N', 'Z', 'C', 'V'];

    return (
        <div className={sectionStyles.section}>
            <div className={sectionStyles.sectionHeader}>Flags</div>
            <div className={styles.grid}>
                {standardFlags.map((key) => (
                    <div key={key} className={styles.cell}>
                        <span>{key}</span>
                        {/* Grab the specific value for this flag from the props */}
                        <strong>{flags[key] !== undefined ? flags[key] : '0'}</strong>
                    </div>
                ))}
            </div>
        </div>
    );

}