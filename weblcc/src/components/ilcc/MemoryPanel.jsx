import styles from './memoryPanel.module.css';

export default function MemoryPanel({ memoryRows = [], previousMemoryRows = [], studentMode = false }) {
    const previousCellMap = new Map();
    previousMemoryRows.forEach((row) => {
        row.cells.forEach((cell) => {
            previousCellMap.set(cell.addr, `${cell.value}:${cell.tags.join(',')}`);
        });
    });

    return (
        <div className={studentMode ? `${styles.content} ${styles.studentMode}` : styles.content}>
            <div className={styles.tableHeader}>
                <span className={`${styles.colLabel}`}>Address</span>
                <span className={styles.colLabel}>+0</span>
                <span className={styles.colLabel}>+1</span>
                <span className={styles.colLabel}>+2</span>
                <span className={styles.colLabel}>+3</span>
            </div>
            {memoryRows.map((row) => (
                <div key={row.addr} className={styles.row}>
                    <span className={styles.address}>{row.addr}</span>
                    {row.cells.map((cell) => (
                        <span
                            key={cell.addr}
                            className={
                                previousCellMap.get(cell.addr) !== `${cell.value}:${cell.tags.join(',')}`
                                    ? `${styles.value} ${styles.changed}`
                                    : styles.value
                            }
                        >
                            {cell.value}
                            {cell.tags.length > 0 ? (
                                <span className={styles.tagWrap}>
                                    {cell.tags.map((tag) => (
                                        <span
                                            key={`${cell.addr}-${tag}`}
                                            className={tag === 'PC' ? `${styles.pcMarker} ${styles.pcChecker}` : styles.pcMarker}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </span>
                            ) : null}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}
