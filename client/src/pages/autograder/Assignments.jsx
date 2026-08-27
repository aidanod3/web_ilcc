/* /autograder — list of assignments. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, ClipboardCheck, Trash2, GraduationCap } from 'lucide-react';
import Page from '../../components/Page';
import ps from '../../components/Page.module.css';
import s from './autograder.module.css';
import { api } from '../../lib/api';
import { fmtDate } from './util';

export default function Assignments() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api('/grader/assignments').then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const del = async (a) => {
    if (!window.confirm(`Delete "${a.title}" and all ${a.submission_count} submissions? This cannot be undone.`)) return;
    try { await api(`/grader/assignments/${a.id}`, { method: 'DELETE' }); load(); } catch (e) { setErr(e.message); }
  };

  const newBtn = <Link to="/autograder/new" className={ps.btnPrimary}><Plus size={14} /> New assignment</Link>;

  return (
    <Page title="Autograder" subtitle="Create assignments with test cases, collect submissions, grade them, and export to Brightspace." wide actions={newBtn}>
      {err && <div className={s.error}>{err}</div>}
      {rows === null && !err && <div className={ps.empty}><span className={ps.spinner} /></div>}
      {rows && rows.length === 0 && (
        <div className={ps.card}>
          <div className={ps.empty}>
            <GraduationCap size={32} style={{ opacity: 0.5 }} />
            <p className={ps.p}><strong>No assignments yet.</strong></p>
            <p className={`${ps.p} ${ps.muted}`}>
              The flow: <b>1.</b> create an assignment with test cases (stdin → expected stdout) &nbsp;→&nbsp;
              <b>2.</b> students submit from the editor, <i>or</i> you upload a Brightspace submissions zip &nbsp;→&nbsp;
              <b>3.</b> grade all &nbsp;→&nbsp; <b>4.</b> review, adjust scores, and export the CSV for Brightspace.
            </p>
            {newBtn}
          </div>
        </div>
      )}
      {rows && rows.length > 0 && (
        <div className={s.tableWrap}>
          <table className={ps.table}>
            <thead>
              <tr><th>Title</th><th>Ch.</th><th>Due</th><th>Status</th><th>Cases</th><th>Submissions</th><th>Created by</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td><Link to={`/autograder/${a.id}`}><strong>{a.title}</strong></Link></td>
                  <td>{a.chapter ?? '—'}</td>
                  <td className={ps.small}>{fmtDate(a.due_at)}</td>
                  <td><span className={`${ps.badge} ${a.is_open ? ps.badgeOk : ''}`}>{a.is_open ? 'open' : 'closed'}</span></td>
                  <td>{a.test_case_count}</td>
                  <td>{a.submission_count}</td>
                  <td className={`${ps.small} ${ps.muted}`}>{a.created_by_email}</td>
                  <td>
                    <div className={s.rowActions}>
                      <Link to={`/autograder/${a.id}/edit`} className={ps.btn} title="Edit"><Pencil size={13} /> Edit</Link>
                      <Link to={`/autograder/${a.id}`} className={ps.btn} title="Grade"><ClipboardCheck size={13} /> Grade</Link>
                      <button className={`${ps.btn} ${ps.btnDanger}`} onClick={() => del(a)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
