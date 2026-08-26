/* Upload a Brightspace submissions zip → preview → import (POST /submissions/bulk). */
import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import ps from '../../components/Page.module.css';
import s from './autograder.module.css';
import { api } from '../../lib/api';

export default function ZipModal({ assignmentId, onClose, onImported }) {
  const [students, setStudents] = useState(null);
  const [pick, setPick] = useState({});      // studentKey -> file index
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const parse = async (file) => {
    if (!file) return;
    setErr(''); setBusy(true);
    try {
      const fd = new FormData(); fd.append('zip', file);
      const r = await api('/grader/parse-submissions', { method: 'POST', body: fd });
      setStudents(r.students || []);
      setPick({});
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const importAll = async () => {
    setErr(''); setBusy(true);
    try {
      const body = {
        assignmentId: Number(assignmentId),
        students: students.filter((st) => st.files.length).map((st) => ({
          name: st.displayName, orgDefinedId: st.orgDefinedId,
          source: st.files[pick[st.studentKey] ?? 0].content,
        })),
      };
      const r = await api('/grader/submissions/bulk', { method: 'POST', body });
      onImported(r.count ?? r.ids?.length ?? body.students.length);
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  const importable = students ? students.filter((st) => st.files.length).length : 0;

  return (
    <div className={s.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={s.modal} role="dialog" aria-modal="true">
        <div className={s.modalHead}>
          <h3>Upload Brightspace zip</h3>
          <button className={s.iconBtn} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <p className={`${ps.p} ${ps.small} ${ps.muted}`}>
          Download all submissions from Brightspace as a zip; the folder names carry the student name and OrgDefinedId.
        </p>
        <input type="file" accept=".zip,application/zip" className={ps.input} disabled={busy} onChange={(e) => parse(e.target.files?.[0])} />
        {err && <div className={s.error}>{err}</div>}
        {busy && <div className={ps.empty}><span className={ps.spinner} /></div>}

        {students && !busy && (
          <>
            <p className={`${ps.p} ${ps.small}`} style={{ marginTop: 12 }}>
              Found <b>{students.length}</b> student{students.length === 1 ? '' : 's'}, {importable} with a source file.
            </p>
            <div className={s.tableWrap}>
              <table className={ps.table}>
                <thead><tr><th>Student</th><th>OrgDefinedId</th><th>File</th></tr></thead>
                <tbody>
                  {students.map((st) => (
                    <tr key={st.studentKey}>
                      <td>{st.displayName}</td>
                      <td className={ps.small}>{st.orgDefinedId || <span className={ps.muted}>—</span>}</td>
                      <td>
                        {st.files.length === 0 && <span className={`${ps.badge} ${ps.badgeWarn}`}>no file</span>}
                        {st.files.length === 1 && <span className={ps.code}>{st.files[0].name}</span>}
                        {st.files.length > 1 && (
                          <select className={ps.select} value={pick[st.studentKey] ?? 0} onChange={(e) => setPick((p) => ({ ...p, [st.studentKey]: Number(e.target.value) }))}>
                            {st.files.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className={s.modalFoot}>
          <button className={ps.btn} onClick={onClose}>Cancel</button>
          <button className={ps.btnPrimary} disabled={!importable || busy} onClick={importAll}>
            <Upload size={14} /> Import {importable ? `(${importable})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
