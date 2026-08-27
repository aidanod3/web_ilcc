/* /autograder/:id — grade submissions: student list | source + results | score panel. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil, Upload, Play, Download, Check, X, ChevronDown, ChevronRight, RefreshCw, Save, Bot, User } from 'lucide-react';
import Page from '../../components/Page';
import ps from '../../components/Page.module.css';
import s from './autograder.module.css';
import { api } from '../../lib/api';
import { fmtDate, fmtScore, exportUrl } from './util';
import ZipModal from './ZipModal';

const statusBadge = (st) => ({ graded: ps.badgeOk, error: ps.badgeErr, grading: ps.badgeWarn }[st] || '');

export default function Grade() {
  const { id } = useParams();
  const [a, setA] = useState(null);
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(null);       // submission_id
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('name');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [zip, setZip] = useState(false);
  const [offerGrade, setOfferGrade] = useState(false);

  const loadA = useCallback(() => api(`/grader/assignments/${id}`).then(setA), [id]);
  const loadRows = useCallback(() => api(`/grader/assignments/${id}/results`).then((r) => setRows(r || [])), [id]);
  useEffect(() => {
    setErr('');
    Promise.all([loadA(), loadRows()]).catch((e) => setErr(e.message));
  }, [loadA, loadRows]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let v = rows;
    if (q) v = v.filter((r) => [r.student_name, r.student_email, r.org_defined_id].some((x) => (x || '').toLowerCase().includes(q)));
    v = [...v].sort((x, y) => {
      if (sort === 'score') return (y.score ?? -1) - (x.score ?? -1) || (x.student_name || '').localeCompare(y.student_name || '');
      if (sort === 'scoreAsc') return (x.score ?? -1) - (y.score ?? -1) || (x.student_name || '').localeCompare(y.student_name || '');
      return (x.student_name || x.student_email || '').localeCompare(y.student_name || y.student_email || '');
    });
    return v;
  }, [rows, filter, sort]);

  useEffect(() => {
    if (sel == null || !rows.some((r) => r.submission_id === sel)) setSel(visible[0]?.submission_id ?? null);
  }, [visible, rows, sel]);

  const current = rows.find((r) => r.submission_id === sel) || null;

  // j/k navigation (ignored while typing)
  useEffect(() => {
    const h = (e) => {
      if (zip) return;
      const t = e.target; const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;
      if (e.key !== 'j' && e.key !== 'k') return;
      const i = visible.findIndex((r) => r.submission_id === sel);
      const n = visible[i + (e.key === 'j' ? 1 : -1)];
      if (n) { setSel(n.submission_id); e.preventDefault(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [visible, sel, zip]);

  const run = async (label, fn) => {
    setBusy(label); setErr(''); setMsg('');
    try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const gradeAll = () => run('gradeAll', async () => {
    const r = await api(`/grader/assignments/${id}/grade-all`, { method: 'POST' });
    setMsg(`Graded ${r.graded}/${r.total}${r.errors ? `, ${r.errors} error(s)` : ''}.`);
    setOfferGrade(false);
    await Promise.all([loadRows(), loadA()]);
  });
  const gradeOne = () => current && run('gradeOne', async () => {
    await api(`/grader/submissions/${current.submission_id}/grade`, { method: 'POST' });
    await loadRows();
  });

  const actions = a && (
    <div className={s.actions}>
      <Link to={`/autograder/${id}/edit`} className={ps.btn}><Pencil size={13} /> Edit</Link>
      <button className={ps.btn} onClick={() => setZip(true)}><Upload size={13} /> Upload zip</button>
      <button className={ps.btn} onClick={gradeAll} disabled={!!busy || rows.length === 0}>
        {busy === 'gradeAll' ? <span className={ps.spinner} /> : <Play size={13} />} Grade all
      </button>
      <a className={ps.btn} href={exportUrl(id)} download><Download size={13} /> Export CSV</a>
    </div>
  );

  return (
    <Page title={a ? a.title : 'Grade'} wide actions={actions}>
      {err && <div className={s.error}>{err}</div>}
      {!a && !err && <div className={ps.empty}><span className={ps.spinner} /></div>}
      {a && (
        <>
          <div className={s.header}>
            <div className={s.headerLeft}>
              <h2>{a.title}</h2>
              {a.chapter != null && <span className={ps.badge}>ch. {a.chapter}</span>}
              <span className={`${ps.badge} ${a.is_open ? ps.badgeOk : ''}`}>{a.is_open ? 'open' : 'closed'}</span>
              <span className={`${ps.small} ${ps.muted}`}>due {fmtDate(a.due_at)} · {a.testCases?.length ?? 0} test cases · {rows.length} submissions</span>
            </div>
            {msg && <span className={`${ps.small} ${ps.muted}`}>{msg}</span>}
          </div>
          {offerGrade && (
            <div className={ps.callout}>
              <Play size={16} className={ps.calloutIcon} />
              <div className={ps.cardRow} style={{ flex: 1 }}>
                <span>Submissions imported. Run the autograder on everything now?</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button className={ps.btnPrimary} onClick={gradeAll} disabled={!!busy}>Grade all now</button>
                  <button className={ps.btn} onClick={() => setOfferGrade(false)}>Later</button>
                </span>
              </div>
            </div>
          )}

          <div className={s.grid}>
            {/* left: students */}
            <div className={`${s.col} ${s.sticky}`}>
              <div className={s.listTools}>
                <input className={ps.input} placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
                <select className={ps.select} value={sort} onChange={(e) => setSort(e.target.value)} title="Sort">
                  <option value="name">Name</option>
                  <option value="score">Score ↓</option>
                  <option value="scoreAsc">Score ↑</option>
                </select>
              </div>
              {visible.length === 0 ? (
                <div className={`${ps.card} ${ps.empty}`}>{rows.length ? 'No matches.' : 'No submissions yet. Students can submit from the editor, or upload a Brightspace zip.'}</div>
              ) : (
                <ul className={s.students}>
                  {visible.map((r) => (
                    <li key={r.submission_id} className={`${s.student} ${r.submission_id === sel ? s.studentActive : ''}`} onClick={() => setSel(r.submission_id)}>
                      <div className={s.studentRow}>
                        <span className={s.studentName}>{r.student_name || r.student_email || `#${r.submission_id}`}</span>
                        <span className={s.score}>{fmtScore(r.score, r.max_score)}</span>
                      </div>
                      <div className={s.studentRow}>
                        <span className={s.studentSub}>{r.student_email || r.org_defined_id || ''}</span>
                        <span className={`${ps.badge} ${statusBadge(r.status)}`}>{r.status || 'pending'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className={`${ps.small} ${ps.muted}`} style={{ marginTop: 8 }}><span className={s.kbd}>j</span> / <span className={s.kbd}>k</span> next / previous student</p>
            </div>

            {/* center: source + results */}
            <div className={s.col}>
              {current ? <Center key={current.submission_id} row={current} onRegrade={gradeOne} busy={busy === 'gradeOne'} /> : <div className={ps.empty}>Select a student.</div>}
            </div>

            {/* right: grade panel */}
            <div className={`${s.col} ${s.sticky}`}>
              {current && <GradePanel key={current.submission_id} row={current} onSaved={loadRows} />}
            </div>
          </div>
        </>
      )}
      {zip && (
        <ZipModal assignmentId={id} onClose={() => setZip(false)} onImported={(n) => {
          setZip(false); setMsg(`Imported ${n} submission${n === 1 ? '' : 's'}.`); setOfferGrade(true);
          Promise.all([loadRows(), loadA()]).catch((e) => setErr(e.message));
        }} />
      )}
    </Page>
  );
}

function Center({ row, onRegrade, busy }) {
  const [src, setSrc] = useState(null);
  const [srcErr, setSrcErr] = useState('');
  useEffect(() => {
    let live = true;
    api(`/grader/submissions/${row.submission_id}/source`, { raw: true })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); const t = await r.text(); if (live) setSrc(t); })
      .catch((e) => live && setSrcErr(e.message));
    return () => { live = false; };
  }, [row.submission_id]);

  const results = row.results || [];
  const passed = results.filter((r) => r.passed).length;

  return (
    <>
      <div className={ps.cardRow} style={{ marginBottom: 6 }}>
        <div>
          <strong>{row.student_name || row.student_email}</strong>
          <span className={`${ps.small} ${ps.muted}`}> · {row.org_defined_id || row.student_email || ''} · submitted {fmtDate(row.submitted_at)}</span>
        </div>
        <button className={ps.btn} onClick={onRegrade} disabled={busy}>{busy ? <span className={ps.spinner} /> : <RefreshCw size={13} />} Re-grade</button>
      </div>
      {srcErr && <div className={s.error}>Could not load source: {srcErr}</div>}
      {src === null && !srcErr && <div className={ps.empty}><span className={ps.spinner} /></div>}
      {src !== null && (
        <pre className={`${ps.pre} ${s.source}`}>
          <div className={s.lineWrap}>
            {src.replace(/\n$/, '').split('\n').map((l, i) => <div key={i} className={s.line}><span>{l || ' '}</span></div>)}
          </div>
        </pre>
      )}

      <h3 className={ps.h3}>Test results <span className={`${ps.muted} ${ps.small}`}>({results.length ? `${passed}/${results.length} passed` : 'not graded'})</span></h3>
      {results.length === 0 ? <div className={`${ps.card} ${ps.empty}`}>Not graded yet. Use "Re-grade" or "Grade all".</div> : (
        <div className={s.cases}>
          {results.map((t) => <Case key={t.test_case_id ?? t.test_name} t={t} />)}
        </div>
      )}
    </>
  );
}

function Case({ t }) {
  const [open, setOpen] = useState(!t.passed);
  const hasBody = !t.passed || t.error;
  return (
    <div className={s.case}>
      <div className={s.caseHead} onClick={() => hasBody && setOpen((o) => !o)}>
        {hasBody ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14 }} />}
        {t.passed ? <Check size={15} className={s.pass} /> : <X size={15} className={s.fail} />}
        <strong>{t.test_name}</strong>
        <span className={`${ps.small} ${ps.muted}`}>w {t.weight}</span>
        {t.runtime_ms != null && <span className={`${ps.small} ${ps.muted}`}>{t.runtime_ms} ms</span>}
      </div>
      {hasBody && open && (
        <div className={s.caseBody}>
          {t.error && <pre className={s.errBox}>{t.error}</pre>}
          {t.diff?.length > 0 && (
            <table className={s.diff}>
              <thead><tr><th>line</th><th>expected</th><th>actual</th></tr></thead>
              <tbody>
                {t.diff.map((d, i) => (
                  <tr key={i}>
                    <td>{d.line}</td>
                    <td className={s.diffExp}>{d.expected ?? <i className={ps.muted}>(none)</i>}</td>
                    <td className={s.diffAct}>{d.actual ?? <i className={ps.muted}>(none)</i>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!t.passed && !t.diff?.length && t.actual_stdout != null && (
            <><div className={`${ps.label}`}>actual stdout</div><pre className={ps.pre} style={{ margin: 0 }}>{t.actual_stdout || '(empty)'}</pre></>
          )}
        </div>
      )}
    </div>
  );
}

function GradePanel({ row, onSaved }) {
  const [score, setScore] = useState(row.score ?? '');
  const [feedback, setFeedback] = useState(row.feedback || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const timer = useRef();

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true); setErr(''); setSaved(false);
    try {
      await api(`/grader/submissions/${row.submission_id}/grade`, { method: 'PUT', body: { score: score === '' ? null : Number(score), feedback } });
      setSaved(true); clearTimeout(timer.current); timer.current = setTimeout(() => setSaved(false), 2000);
      await onSaved();
    } catch (ex) { setErr(ex.message); } finally { setSaving(false); }
  };

  const byBot = !row.graded_by_email || row.graded_by_email === 'autograder';
  return (
    <form className={`${ps.card} ${s.panel}`} onSubmit={save}>
      <h3 className={ps.h3} style={{ marginTop: 0 }}>Grade</h3>
      <label className={ps.label} style={{ marginTop: 0 }}>Score <span className={ps.muted}>/ {row.max_score ?? '?'}</span></label>
      <input className={ps.input} type="number" step="any" min="0" max={row.max_score ?? undefined} value={score} onChange={(e) => setScore(e.target.value)} />
      <label className={ps.label}>Feedback</label>
      <textarea className={ps.textarea} rows={8} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Shown to the student and exported to Brightspace." />
      {err && <div className={s.error}>{err}</div>}
      <div className={s.panelRow} style={{ marginTop: 12 }}>
        <button type="submit" className={ps.btnPrimary} disabled={saving}>{saving ? <span className={ps.spinner} /> : <Save size={14} />} Save</button>
        {saved && <span className={`${ps.small} ${s.pass}`}>Saved</span>}
      </div>
      <p className={`${ps.small} ${ps.muted}`} style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        {row.graded_at ? (
          byBot ? <><Bot size={13} /> graded by autograder</> : <><User size={13} /> graded by {row.graded_by_email}</>
        ) : 'not graded yet'}
      </p>
      {row.graded_at && <p className={`${ps.small} ${ps.muted}`} style={{ marginTop: 2 }}>{fmtDate(row.graded_at)}</p>}
    </form>
  );
}
