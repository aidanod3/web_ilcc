/* Downloads — course package, debugger, textbook. */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Copy, Check } from 'lucide-react';
import Page from '../../components/Page';
import ps from '../../components/Page.module.css';
import { api, fmtBytes } from '../../lib/api';

const BASE = import.meta.env.BASE_URL;

const GROUPS = [
  { title: 'Course package (pick your OS)', match: (d) => /linux|mac|windows|win/i.test(d.os || d.id || d.file || '') && !/cuh63\.zip$/i.test(d.file || '') && !/debug|textbook|\.pdf$/i.test(d.file || '') },
  { title: 'Everything in one zip', match: (d) => /cuh63\.zip$/i.test(d.file || '') },
  { title: 'Debugger only', match: (d) => /debug/i.test(`${d.id || ''} ${d.file || ''} ${d.title || ''}`) },
  { title: 'Textbook', match: (d) => /textbook|\.pdf$/i.test(`${d.id || ''} ${d.file || ''} ${d.title || ''}`) },
];

function ShaButton({ sha }) {
  const [ok, setOk] = useState(false);
  if (!sha) return null;
  const copy = () => { navigator.clipboard?.writeText(sha).then(() => { setOk(true); setTimeout(() => setOk(false), 1200); }); };
  return (
    <span className={`${ps.muted} ${ps.small}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      sha256 <code className={ps.code}>{sha.slice(0, 16)}…</code>
      <button className={ps.copyBtn} style={{ position: 'static' }} onClick={copy} title="Copy full sha256">{ok ? <Check size={11} /> : <Copy size={11} />}</button>
    </span>
  );
}

function Card({ d }) {
  return (
    <div className={ps.card}>
      <h3 className={ps.h3} style={{ marginTop: 0 }}>{d.title || d.file}</h3>
      {d.description && <p className={`${ps.p} ${ps.small}`}>{d.description}</p>}
      <div className={`${ps.muted} ${ps.small}`} style={{ marginBottom: 10 }}>
        <code className={ps.code}>{d.file}</code>{d.size != null && ` · ${fmtBytes(d.size)}`}
      </div>
      <div style={{ marginBottom: 10 }}><ShaButton sha={d.sha256} /></div>
      <a className={ps.btnPrimary} href={`${BASE}api/downloads/${d.file}`} download><Download size={14} /> Download</a>
    </div>
  );
}

export default function Downloads() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api('/downloads/manifest')
      .then((m) => setItems(Array.isArray(m) ? m : m?.files || m?.items || m?.downloads || Object.values(m || {}).flat()))
      .catch((e) => setErr(e.message));
  }, []);

  const grouped = useMemo(() => {
    let rest = items ? [...items] : [];
    const out = GROUPS.map((g) => {
      const mine = rest.filter(g.match);
      rest = rest.filter((d) => !mine.includes(d));
      return { ...g, items: mine };
    });
    if (rest.length) out.push({ title: 'Other', items: rest });
    return out;
  }, [items]);

  return (
    <Page title="Downloads" subtitle="Everything you need to run the course tools on your own machine.">
      {err && <div className={ps.card}><p className={ps.p}>Couldn't load the download list: {err}</p></div>}
      {!items && !err && <div className={ps.empty}><span className={ps.spinner} /></div>}
      {items && !items.length && <div className={ps.empty}>Nothing to download yet.</div>}
      {grouped.filter((g) => g.items.length).map((g) => (
        <section key={g.title}>
          <h2 className={ps.h2}>{g.title}</h2>
          <div className={ps.grid}>{g.items.map((d) => <Card key={d.file} d={d} />)}</div>
        </section>
      ))}
      <p className={ps.p} style={{ marginTop: 28 }}>Need install help? <Link to="/setup">→ Setup guide</Link></p>
    </Page>
  );
}
