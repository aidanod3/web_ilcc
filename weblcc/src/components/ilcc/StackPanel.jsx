import styles from './stackPanel.module.css';

export default function StackPanel({ stack = [], previousStack = [], eventLabel = '', studentMode = false }) {
    const previousStackMap = new Map(previousStack.map((item) => [item.addr, `${item.value}:${item.tags.join(',')}`]));

    return (
        <div className={studentMode ? `${styles.content} ${styles.studentMode}` : styles.content}>
            {stack.map(({ addr, value, tags = [] }) => (
                <div
                    key={addr}
                    className={[
                        styles.row,
                        tags.includes('SP') ? styles.spRow : '',
                        previousStackMap.get(addr) !== `${value}:${tags.join(',')}` ? styles.changed : ''
                    ].filter(Boolean).join(' ')}
                >
                    <span className={styles.address}>{addr}</span>
                    <span className={styles.value}>{value}</span>
                    {tags.map((tag) => (
                        <span key={`${addr}-${tag}`} className={styles.spMarker}>{tag}</span>
                    ))}
                </div>
            ))}
            {eventLabel ? (
                <div className={styles.eventLabel}>
                    {studentMode ? `What just happened: ${eventLabel}` : eventLabel}
                </div>
            ) : null}
        </div>
    );
}
