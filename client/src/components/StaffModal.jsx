/*
 * StaffModal — admins manage who is a TA / admin.
 * Lists current staff with who added them; add form; per-row remove.
 * Server enforces: @newpaltz.edu only, can't remove self or the last admin.
 */
import { useEffect, useState } from 'react';
import { X, UserPlus, Trash2, ShieldCheck, GraduationCap } from 'lucide-react';
import { api } from '../lib/api';
import useMe from '../hooks/useMe';
import styles from './StaffModal.module.css';
import ps from './Page.module.css';

export default function StaffModal({ onClose }) {
  const { me } = useMe();
  const [rows, setRows] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('ta');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/staff').then(j => setRows(j.staff)).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const add = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api('/staff', { method: 'POST', body: { email: email.trim(), role } }); setEmail(''); await load(); }
    catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  };
  const remove = async (r) => {
    if (!confirm(`Remove ${r.email} (${r.role})?`)) return;
    setErr('');
    try { await api(`/staff/${encodeURIComponent(r.email)}`, { method: 'DELETE' }); await load(); }
    catch (e2) { setErr(e2.message); }
  };

  return (
    <div className={styles.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="staff-title">
        <div className={styles.head}>
          <h2 id="staff-title" className={styles.title}><ShieldCheck size={18} /> Staff</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <p className={`${ps.p} ${ps.small} ${ps.muted}`}>
          <b>Admins</b> manage this list and can grade. <b>TAs</b> can create assignments and grade.
          Faculty are admins automatically when they sign in.
        </p>

        <form className={styles.addRow} onSubmit={add}>
          <input className={ps.input} type="email" placeholder="netid@newpaltz.edu" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          <select className={ps.select} value={role} onChange={e => setRole(e.target.value)} aria-label="Role">
            <option value="ta">TA</option>
            <option value="admin">Admin</option>
          </select>
          <button className={ps.btnPrimary} type="submit" disabled={busy}><UserPlus size={14} /> Add</button>
        </form>
        {err && <div className={styles.err}>{err}</div>}

        {rows === null ? <div className={ps.empty}><span className={ps.spinner} /></div> : (
          <table className={ps.table}>
            <thead><tr><th>Email</th><th>Role</th><th>Added by</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.email}>
                  <td>{r.email}{r.email === me?.email && <span className={`${ps.badge} ${styles.you}`}>you</span>}</td>
                  <td>{r.role === 'admin' ? <span className={`${ps.badge} ${ps.badgeOk}`}><ShieldCheck size={11} /> admin</span> : <span className={ps.badge}><GraduationCap size={11} /> TA</span>}</td>
                  <td className={ps.muted}>{r.added_by_email}<br /><span className={ps.small}>{r.added_at?.slice(0, 10)}</span></td>
                  <td><button className={`${ps.btn} ${ps.btnDanger}`} onClick={() => remove(r)} disabled={r.email === me?.email} title={r.email === me?.email ? "You can't remove yourself" : 'Remove'}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
