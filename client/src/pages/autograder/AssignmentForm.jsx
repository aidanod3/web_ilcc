/* /autograder/new and /autograder/:id/edit — assignment + test case editor. */
import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Trash2, ArrowUp, ArrowDown, Info, Save } from 'lucide-react';
import Page from '../../components/Page';
import ps from '../../components/Page.module.css';
import s from './autograder.module.css';
import { api } from '../../lib/api';
import { toLocalInput } from './util';

const blankCase = () => ({ name: '', stdin: '', expected_stdout: '', weight: 1 });

export default function AssignmentForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const editing = !!id;
  const [form, setForm] = useState({ title: '', chapter: '', description: '', due_at: '', is_open: true });
  const [cases, setCases] = useState([blankCase()]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!editing) return;
    api(`/grader/assignments/${id}`).then((a) => {
      setForm({ title: a.title || '', chapter: a.chapter ?? '', description: a.description || '', due_at: toLocalInput(a.due_at), is_open: !!a.is_open });
      const tcs = [...(a.testCases || [])].sort((x, y) => x.ordinal - y.ordinal);
      setCases(tcs.length ? tcs.map((t) => ({ name: t.name || '', stdin: t.stdin || '', expected_stdout: t.expected_stdout || '', weight: t.weight ?? 1 })) : [blankCase()]);
    }).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [id, editing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCase = (i, k, v) => setCases((cs) => cs.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  const move = (i, d) => setCases((cs) => {
    const j = i + d; if (j < 0 || j >= cs.length) return cs;
    const n = [...cs]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const remove = (i) => setCases((cs) => (cs.length > 1 ? cs.filter((_, j) => j !== i) : cs));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.title.trim()) { setErr('Title is required.'); return; }
    const body = {
      title: form.title.trim(),
      chapter: form.chapter === '' ? null : Number(form.chapter),
      description: form.description || null,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      is_open: !!form.is_open,
      testCases: cases.map((c, i) => ({
        name: c.name.trim() || `Test ${i + 1}`, stdin: c.stdin, expected_stdout: c.expected_stdout,
        weight: Number(c.weight) || 1, ordinal: i,
      })),
    };
    setSaving(true);
    try {
      const r = editing
        ? await api(`/grader/assignments/${id}`, { method: 'PUT', body })
        : await api('/grader/assignments', { method: 'POST', body });
      nav(`/autograder/${editing ? id : r.id}`);
    } catch (ex) { setErr(ex.message); } finally { setSaving(false); }
  };

  const totalWeight = cases.reduce((a, c) => a + (Number(c.weight) || 0), 0);

  return (
    <Page title={editing ? 'Edit assignment' : 'New assignment'} wide>
      {loading ? <div className={ps.empty}><span className={ps.spinner} /></div> : (
        <form onSubmit={submit}>
          {err && <div className={s.error}>{err}</div>}
          <div className={ps.card}>
            <label className={ps.label} style={{ marginTop: 0 }}>Title</label>
            <input className={ps.input} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Lab 6 — Loops" required />
            <div className={s.formRow}>
              <div>
                <label className={ps.label}>Chapter</label>
                <input className={ps.input} type="number" min="0" value={form.chapter} onChange={(e) => set('chapter', e.target.value)} placeholder="6" />
              </div>
              <div>
                <label className={ps.label}>Due</label>
                <input className={ps.input} type="datetime-local" value={form.due_at} onChange={(e) => set('due_at', e.target.value)} />
              </div>
            </div>
            <label className={ps.label}>Description</label>
            <textarea className={ps.textarea} style={{ fontFamily: 'inherit', fontSize: 13.5 }} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Shown to students in the editor." />
            <label className={s.check}>
              <input type="checkbox" checked={form.is_open} onChange={(e) => set('is_open', e.target.checked)} />
              Open for submissions
            </label>
          </div>

          <h2 className={ps.h2}>Test cases <span className={`${ps.muted} ${ps.small}`}>({cases.length}, total weight {totalWeight})</span></h2>
          <div className={ps.callout}>
            <Info size={16} className={ps.calloutIcon} />
            <div>
              stdin lines are fed one per <code className={ps.code}>din</code>/<code className={ps.code}>sin</code>/<code className={ps.code}>ain</code>;
              expected output is compared with trailing whitespace ignored; the input is <b>not</b> echoed into the output for grading.
            </div>
          </div>

          {cases.map((c, i) => (
            <div key={i} className={ps.card} style={{ marginBottom: 10 }}>
              <div className={s.tcHead}>
                <span className={`${ps.muted} ${ps.small}`}>#{i + 1}</span>
                <input type="text" className={ps.input} value={c.name} onChange={(e) => setCase(i, 'name', e.target.value)} placeholder={`Test ${i + 1}`} />
                <label className={`${ps.small} ${ps.muted}`}>weight</label>
                <input type="number" className={ps.input} min="0" step="any" value={c.weight} onChange={(e) => setCase(i, 'weight', e.target.value)} />
                <button type="button" className={s.iconBtn} onClick={() => move(i, -1)} disabled={i === 0} title="Move up"><ArrowUp size={14} /></button>
                <button type="button" className={s.iconBtn} onClick={() => move(i, 1)} disabled={i === cases.length - 1} title="Move down"><ArrowDown size={14} /></button>
                <button type="button" className={s.iconBtn} onClick={() => remove(i)} disabled={cases.length === 1} title="Remove"><Trash2 size={14} /></button>
              </div>
              <div className={s.tcRow}>
                <div>
                  <label className={ps.label}>stdin</label>
                  <textarea className={ps.textarea} value={c.stdin} onChange={(e) => setCase(i, 'stdin', e.target.value)} placeholder="one input per line" spellCheck={false} />
                </div>
                <div>
                  <label className={ps.label}>expected stdout</label>
                  <textarea className={ps.textarea} value={c.expected_stdout} onChange={(e) => setCase(i, 'expected_stdout', e.target.value)} placeholder="exact program output" spellCheck={false} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className={ps.btn} onClick={() => setCases((cs) => [...cs, blankCase()])}><Plus size={14} /> Add test case</button>

          <div className={ps.cardRow} style={{ marginTop: 20, justifyContent: 'flex-end' }}>
            <Link to={editing ? `/autograder/${id}` : '/autograder'} className={ps.btn}>Cancel</Link>
            <button type="submit" className={ps.btnPrimary} disabled={saving}>
              {saving ? <span className={ps.spinner} /> : <Save size={14} />} {editing ? 'Save changes' : 'Create assignment'}
            </button>
          </div>
        </form>
      )}
    </Page>
  );
}
