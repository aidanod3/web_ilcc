import styles from './cpuPanel.module.css';

const registers = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];
const conditionCodes = ['C', 'V', 'N', 'Z'];
const pointers = ['FP', 'SP', 'LR', 'PC', 'IR'];

export default function CPUPanel() {
    return (
        <div className={styles.content}>
            <div className={styles.section}>
                <span className={styles.sectionTitle}>Registers</span>
                {registers.map(reg => (
                    <div key={reg} className={styles.row}>
                        <span className={styles.label}>{reg}</span>
                        <span className={styles.value}>0x0000</span>
                    </div>
                ))}
            </div>

            <div className={styles.section}>
                <span className={styles.sectionTitle}>Condition Codes</span>
                <div className={styles.flagRow}>
                    {conditionCodes.map(cc => (
                        <div key={cc} className={styles.flag}>
                            <span className={styles.flagLabel}>{cc}</span>
                            <span className={styles.flagValue}>0</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <span className={styles.sectionTitle}>Pointers</span>
                {pointers.map(ptr => (
                    <div key={ptr} className={styles.row}>
                        <span className={styles.label}>{ptr}</span>
                        <span className={styles.value}>0x0000</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
