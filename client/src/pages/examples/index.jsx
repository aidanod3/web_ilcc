/* Examples — gallery of demo programs. */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ExternalLink, Copy, Check } from 'lucide-react';
import Page from '../../components/Page';
import ps from '../../components/Page.module.css';
import { api } from '../../lib/api';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const isCode = (l) => l.trim() && !/^\s*(;|#|\/\/|\*|\/\*|%)/.test(l);
const codeLines = (c) => (c || '').split('\n').filter(isCode);

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1200); }); };
  return <button className={ps.btn} onClick={copy}>{ok ? <Check size={14} /> : <Copy size={14} />} {ok ? 'Copied' : 'Copy'}</button>;
}

export default function Examples() {
  const [demos, setDemos] = useState(null);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => { api('/demos').then(setDemos).catch((e) => setErr(e.message)); }, []);

  const list = useMemo(() => {
    if (!demos) return [];
    const needle = q.trim().toLowerCase();
    return [...demos]
      .filter((d) => !needle || `${d.name} ${d.description || ''} ${d.content || ''}`.toLowerCase().includes(needle))
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [demos, q]);

  return (
    <Page title="Examples" subtitle="Sample programs you can open in the editor and run right away.">
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text2)' }} />
        <input className={ps.input} style={{ paddingLeft: 30 }} placeholder="Search examples…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {err && <div className={ps.card}><p className={ps.p}>Couldn't load examples: {err}</p></div>}
      {!demos && !err && <div className={ps.empty}><span className={ps.spinner} /></div>}
      {demos && !list.length && <div className={ps.empty}>{q ? 'No examples match your search.' : 'No examples yet.'}</div>}
      <div className={ps.grid}>
        {list.map((d) => {
          const lines = codeLines(d.content);
          const desc = d.description || lines.slice(0, 2).join('\n');
          return (
            <div className={ps.card} key={d.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h3 className={ps.h3} style={{ margin: 0 }}><code className={ps.code}>{d.name}</code></h3>
              {d.description
                ? <p className={`${ps.p} ${ps.small}`} style={{ margin: 0 }}>{desc}</p>
                : <pre className={ps.pre} style={{ margin: 0 }}>{desc}</pre>}
              <span className={`${ps.muted} ${ps.small}`}>{lines.length} instruction{lines.length === 1 ? '' : 's'}</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <Link className={ps.btnPrimary} to={'/?demo=' + encodeURIComponent(d.name)}><ExternalLink size={14} /> Open in editor</Link>
                <CopyBtn text={d.content || ''} />
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
