import styles from './memoryPanel.module.css';

// const memoryEntries = Array.from({ length: 24 }, (_, i) => ({
//     address: `0x${i.toString(16).padStart(4, '0').toUpperCase()}`,
//     value: '0x0000',
//     isPC: i === 0,
// }));

export default function MemoryPanel() {
    return (
        <div className={styles.content}>
            {/* <div className={styles.tableHeader}>
                <span className={`${styles.colLabel}`}>Address</span>
                <span className={styles.colLabel}>Value</span>
            </div>
            {memoryEntries.map(({ address, value, isPC }) => (
                <div
                    key={address}
                    className={`${styles.row} ${isPC ? styles.pcRow : ''}`}
                >
                    <span className={styles.address}>{address}</span>
                    <span className={styles.value}>{value}</span>
                    {isPC && <span className={styles.pcMarker}>PC</span>}
                </div>
            ))} */}
        </div>
    );
}
