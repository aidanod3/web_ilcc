import styles from './cpuPanel.module.css';

const conditionCodes = ['C', 'V', 'N', 'Z'];
const pointers = ['FP', 'SP', 'LR', 'PC', 'IR'];

export default function CPUPanel({
    registers = [],
    previousRegisters = [],
    flags = {},
    previousFlags = {},
    special = [],
    studentMode = false
}) {
    const previousRegisterMap = new Map(previousRegisters.map((reg) => [reg.name, reg.value]));
    const pointerValues = {
        FP: registers.find((reg) => reg.name.startsWith('r5'))?.value || '0x0000',
        SP: registers.find((reg) => reg.name.startsWith('r6'))?.value || '0x0000',
        LR: registers.find((reg) => reg.name.startsWith('r7'))?.value || '0x0000',
        PC: special.find((entry) => entry.name === 'pc')?.value || '0x0000',
        IR: special.find((entry) => entry.name === 'ir')?.value || '0x0000'
    };

    return (
        <div className={studentMode ? `${styles.content} ${styles.studentMode}` : styles.content}>
            <div className={styles.section}>
                <span className={styles.sectionTitle}>{studentMode ? 'Number Boxes' : 'Registers'}</span>
                {registers.map((reg) => (
                    <div
                        key={reg.name}
                        className={
                            previousRegisterMap.get(reg.name) !== reg.value
                                ? `${styles.row} ${styles.changed}`
                                : styles.row
                        }
                    >
                        <span className={styles.label}>{reg.name.toUpperCase()}</span>
                        <span className={styles.value}>{reg.value}</span>
                    </div>
                ))}
            </div>

            <div className={styles.section}>
                <span className={styles.sectionTitle}>{studentMode ? 'Signal Lights' : 'Condition Codes'}</span>
                <div className={styles.flagRow}>
                    {conditionCodes.map((cc) => (
                        <div
                            key={cc}
                            className={
                                (previousFlags[cc] ?? 0) !== (flags[cc] ?? 0)
                                    ? `${styles.flag} ${styles.changed}`
                                    : styles.flag
                            }
                        >
                            <span className={styles.flagLabel}>{cc}</span>
                            <span className={styles.flagValue}>{flags[cc] ?? 0}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <span className={styles.sectionTitle}>Pointers</span>
                {pointers.map((ptr) => (
                    <div key={ptr} className={styles.row}>
                        <span className={styles.label}>{ptr}</span>
                        <span className={styles.value}>{pointerValues[ptr]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
