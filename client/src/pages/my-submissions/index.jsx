/* My submissions — open assignments + autograder results. */
import { useEffect, useState, Fragment } from 'react';
import { ChevronDown, ChevronRight, Check, X, Info } from 'lucide-react';
import Page from '../../components/Page';
import ps from '../../components/Page.module.css';
import { api } from '../../lib/api';

const rel = (iso) => {
  if (!iso) return '';
  const diff = (new Date(iso) - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
};
const abs = (iso) => (iso ? new Date(iso).toLocaleString() : '');

const badgeCls = { graded: ps.badgeOk, pending: ps.badgeWarn, error: ps.badgeErr };

export default function MySubmissions() {
  const [subs, setSubs] = useState(null);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    api('/assignments/open').then(setOpen).catch(() => setOpen([]));
    api('/submissions/mine').then(setSubs).catch((e) => setErr(e.message));
  }, []);

  const toggle = (id) => setExpanded((x) => ({ ...x, [id]: !x[id] }));

  return (
    <Page title="My submissions" subtitle="Open assignments and the results of everything you've submitted.">
      <h2 className={ps.h2} style={{ marginTop: 0 }}>Open assignments</h2>
      <div className={ps.callout}><Info size={16} className={ps.calloutIcon} /><span>Submit from the editor: write your program, then use <strong>Submit</strong> in the header.</span></div>
      {!open && <div className={ps.empty}><span className={ps.spinner} /></div>}
      {open && !open.length && <div className={ps.empty}>No assignments are open right now.</div>}
      {open && open.length > 0 && (
        <div className={ps.grid}>
          {open.map((a) => (
            <div className={ps.card} key={a.id}>
              <h3 className={ps.h3} style={{ marginTop: 0 }}>{a.title}</h3>
              <div className={`${ps.muted} ${ps.small}`} style={{ marginBottom: 8 }}>
                {a.chapter != null && <>Chapter {a.chapter} · </>}
                {a.due_at ? <span title={abs(a.due_at)}>Due {rel(a.due_at)} ({abs(a.due_at)})</span> : 'No due date'}
              </div>
              {a.description && <p className={`${ps.p} ${ps.small}`} style={{ margin: 0 }}>{a.description}</p>}
            </div>
          ))}
        </div>
      )}

      <h2 className={ps.h2}>Submissions</h2>
      {err && <div className={ps.card}><p className={ps.p}>Couldn't load submissions: {err}</p></div>}
      {!subs && !err && <div className={ps.empty}><span className={ps.spinner} /></div>}
      {subs && !subs.length && <div className={ps.empty}>You haven't submitted anything yet.</div>}
      {subs && subs.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className={ps.table}>
            <thead><tr><th style={{ width: 28 }} /><th>Assignment</th><th>Submitted</th><th>Status</th><th>Score</th></tr></thead>
            <tbody>
              {subs.map((sub) => {
                const isOpen = !!expanded[sub.id];
                const results = sub.results || [];
                return (
                  <Fragment key={sub.id}>
                    <tr onClick={() => toggle(sub.id)} style={{ cursor: 'pointer' }}>
                      <td>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                      <td>{sub.title || `Assignment #${sub.assignment_id}`}</td>
                      <td title={abs(sub.submitted_at)}>{rel(sub.submitted_at)}</td>
                      <td><span className={`${ps.badge} ${badgeCls[sub.status] || ''}`}>{sub.status}</span></td>
                      <td>{sub.score != null ? `${sub.score} / ${sub.max_score ?? '?'}` : '—'}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td />
                        <td colSpan={4}>
                          {results.length ? (
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                              {results.map((r, i) => (
                                <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0' }}>
                                  {r.passed ? <Check size={14} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} /> : <X size={14} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 2 }} />}
                                  <span>
                                    {r.name}{r.runtime_ms != null && <span className={`${ps.muted} ${ps.small}`}> · {r.runtime_ms} ms</span>}
                                    {r.error && <pre className={ps.pre} style={{ margin: '4px 0 0' }}>{r.error}</pre>}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : <span className={ps.muted}>{sub.status === 'pending' ? 'Waiting for the grader…' : 'No test results.'}</span>}
                          {sub.feedback && (
                            <div className={ps.callout} style={{ marginBottom: 0 }}>
                              <span><strong>Feedback</strong>{sub.graded_at && <span className={`${ps.muted} ${ps.small}`}> · {abs(sub.graded_at)}</span>}<br />{sub.feedback}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
