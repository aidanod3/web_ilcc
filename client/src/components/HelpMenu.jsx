/*
 * HelpMenu — "Help" dropdown used in both the editor header and page shell.
 * Guide (tour) · Debugging tour · Setup & downloads · Course materials · FAQ · Docs · Report a bug
 */
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, ChevronDown, BookOpen, Download, FileText, Bug, Compass, StepForward, Library } from 'lucide-react';
import { startTour } from '../hooks/useTour';
import styles from './Menu.module.css';

const REPO = 'https://github.com/ndg8743/web_ilcc';

export default function HelpMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const onEditor = loc.pathname === '/';
  const tour = (part) => {
    setOpen(false);
    if (onEditor) startTour(part);
    else nav(`/?tour=${part}`);
  };

  const bugUrl = () => {
    const body = encodeURIComponent(`**What happened?**\n\n\n**Steps to reproduce**\n1.\n\n**Page:** ${window.location.href}\n**Browser:** ${navigator.userAgent}`);
    return `${REPO}/issues/new?title=&body=${body}`;
  };

  return (
    <div className={styles.wrap} ref={ref}>
      <button className={styles.trigger} onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} data-tour="guide" title="Help">
        <HelpCircle size={17} /> <span className={styles.triggerLabel}>Help</span> <ChevronDown size={12} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <button className={styles.item} role="menuitem" onClick={() => tour('basics')}><Compass size={15} /> Take the tour</button>
          <button className={styles.item} role="menuitem" onClick={() => tour('debug')}><StepForward size={15} /> Debugging tour</button>
          <div className={styles.divider} />
          <Link className={styles.item} role="menuitem" to="/setup" onClick={() => setOpen(false)}><Download size={15} /> Setup &amp; downloads</Link>
          <Link className={styles.item} role="menuitem" to="/materials" onClick={() => setOpen(false)}><Library size={15} /> Slides &amp; textbook</Link>
          <Link className={styles.item} role="menuitem" to="/docs" onClick={() => setOpen(false)}><BookOpen size={15} /> LCC reference</Link>
          <Link className={styles.item} role="menuitem" to="/faq" onClick={() => setOpen(false)}><FileText size={15} /> FAQ</Link>
          <div className={styles.divider} />
          <a className={styles.item} role="menuitem" href={bugUrl()} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}><Bug size={15} /> Report a bug</a>
        </div>
      )}
    </div>
  );
}
