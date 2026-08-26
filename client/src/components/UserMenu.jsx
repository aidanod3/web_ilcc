/*
 * UserMenu — sign-in state + staff/autograder entry points.
 * Anonymous: "Sign in" (SAML via a forward-auth'd URL).
 * Student:   email · My submissions.
 * TA/Admin:  + Autograder; Admin: + Staff (opens StaffModal).
 */
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, ChevronDown, LogIn, ClipboardList, Users, GraduationCap } from 'lucide-react';
import useMe, { loginUrl } from '../hooks/useMe';
import StaffModal from './StaffModal';
import styles from './Menu.module.css';

export default function UserMenu() {
  const { me, loading, isSignedIn, isTA, isAdmin } = useMe();
  const [open, setOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  /* Nudge admins once per session to add TAs when the staff list is tiny. */
  useEffect(() => {
    if (!isAdmin || sessionStorage.getItem('ilcc.staffNudged')) return;
    sessionStorage.setItem('ilcc.staffNudged', '1');
    fetch(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/staff`, { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j && j.staff.length < 2) setStaffOpen(true); })
      .catch(() => {});
  }, [isAdmin]);

  if (loading) return <div className={styles.trigger} aria-busy="true"><User size={17} /></div>;

  if (!isSignedIn) {
    return (
      <a className={styles.trigger} href={loginUrl()} title="Sign in with SUNY New Paltz SSO" data-tour="signin">
        <LogIn size={16} /> <span className={styles.triggerLabel}>Sign in</span>
      </a>
    );
  }

  const role = me.role === 'admin' ? 'Admin' : me.role === 'ta' ? 'TA' : null;

  return (
    <div className={styles.wrap} ref={ref}>
      <button className={styles.trigger} onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} title={me.email}>
        <User size={16} />
        <span className={styles.triggerLabel}>{me.netid}</span>
        {role && <span className={styles.roleBadge}>{role}</span>}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.meta}>{me.email}</div>
          <Link className={styles.item} role="menuitem" to="/my-submissions" onClick={() => setOpen(false)}><ClipboardList size={15} /> My submissions</Link>
          {isTA && <Link className={styles.item} role="menuitem" to="/autograder" onClick={() => setOpen(false)}><GraduationCap size={15} /> Autograder</Link>}
          {isAdmin && <button className={styles.item} role="menuitem" onClick={() => { setOpen(false); setStaffOpen(true); }}><Users size={15} /> Staff…</button>}
        </div>
      )}
      {staffOpen && <StaffModal onClose={() => setStaffOpen(false)} />}
    </div>
  );
}
