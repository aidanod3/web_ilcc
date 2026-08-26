/*
 * Page — shell for the non-editor pages (setup, faq, downloads, materials,
 * autograder…). Same header bar as the editor, scrollable content column.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import HelpMenu from './HelpMenu';
import UserMenu from './UserMenu';
import useTheme from '../hooks/useTheme';
import logoWht from '../assets/ilcc_wht.PNG';
import logoBlk from '../assets/ilcc_blk.png';
import styles from './Page.module.css';

export default function Page({ title, subtitle, wide = false, children, actions }) {
  const { theme } = useTheme();
  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <div className={styles.left}>
          <Link to="/" className={styles.back} title="Back to the editor" aria-label="Back to the editor">
            <ArrowLeft size={16} />
          </Link>
          <Link to="/" className={styles.brand}>
            <img src={theme === 'light' ? logoBlk : logoWht} alt="ilcc" className={styles.logo} />
          </Link>
          {title && <h1 className={styles.title}>{title}</h1>}
        </div>
        <div className={styles.right}>
          {actions}
          <HelpMenu />
          <UserMenu />
        </div>
      </header>
      <main className={`${styles.main} ${wide ? styles.wide : ''}`}>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </main>
    </div>
  );
}
