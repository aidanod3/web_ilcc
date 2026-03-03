import styles from './stackPanel.module.css';

const stackEntries = [
    { address: '0x2FF8', value: '0x0000' },
    { address: '0x2FF9', value: '0x0000' },
    { address: '0x2FFA', value: '0x0000' },
    { address: '0x2FFB', value: '0x0000' },
    { address: '0x2FFC', value: '0x001A', isSP: true },
    { address: '0x2FFD', value: '0x0042' },
    { address: '0x2FFE', value: '0x1234' },
    { address: '0x2FFF', value: '0x0000' },
];

export default function StackPanel() {
    return (
        <div className={styles.content}>
            {stackEntries.map(({ address, value, isSP }) => (
                <div
                    key={address}
                    className={`${styles.row} ${isSP ? styles.spRow : ''}`}
                >
                    <span className={styles.address}>{address}</span>
                    <span className={styles.value}>{value}</span>
                    {isSP && <span className={styles.spMarker}>SP</span>}
                </div>
            ))}
        </div>
    );
}
