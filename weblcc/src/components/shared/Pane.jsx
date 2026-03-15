import styles from './pane.module.css';

export default function Pane({ children }) {
    return (
        <div className={styles.container}>
            {children}
        </div>
    )
}