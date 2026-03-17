import styles from './paneHeader.module.css';

export default function PaneHeader({ children }) {
    return (
        <div className={styles.header}>
            {children}
        </div>
    )
}