/* FAQ — searchable accordion with deep links (#id). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import Page from '../../components/Page';
import ps from '../../components/Page.module.css';
import { FAQ } from './faq';

/* Plain-text version of each answer, computed once, for searching. */
const textOf = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node) + ' ';
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props?.children);
};
const INDEX = FAQ.map((f) => ({ ...f, text: `${f.q} ${f.tags.join(' ')} ${textOf(f.a)}`.toLowerCase() }));

export default function Faq() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(() => new Set());
  const refs = useRef({});

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INDEX;
    const terms = q.split(/\s+/);
    return INDEX.filter((f) => terms.every((t) => f.text.includes(t)));
  }, [query]);

  // Deep link: open + scroll to #id on mount and on hash change.
  useEffect(() => {
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || !FAQ.some((f) => f.id === id)) return;
      setQuery('');
      setOpen((s) => new Set(s).add(id));
      requestAnimationFrame(() => refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);

  const toggle = (id, isOpen) => setOpen((s) => { const n = new Set(s); isOpen ? n.add(id) : n.delete(id); return n; });

  return (
    <Page title="FAQ" subtitle="Common questions about LCC, the course software and this site.">
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text2)' }} />
        <input className={ps.input} style={{ paddingLeft: 32 }} type="search" placeholder="Search questions…"
          value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search FAQ" />
      </div>
      {list.length === 0 && <div className={ps.empty}>No matches. Try different words, or ask your lab instructor.</div>}
      {list.map((f) => (
        <details key={f.id} id={f.id} ref={(el) => { refs.current[f.id] = el; }}
          open={open.has(f.id) || !!query} onToggle={(e) => toggle(f.id, e.currentTarget.open)}
          className={ps.card} style={{ marginBottom: 8, padding: 0, scrollMarginTop: 64 }}>
          <summary style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14.5 }}>
            {f.q}
            <a href={`#${f.id}`} className={ps.muted} style={{ marginLeft: 8, fontWeight: 400, fontSize: 12, textDecoration: 'none' }} title="Link to this question" onClick={(e) => e.stopPropagation()}>#</a>
          </summary>
          <div className={ps.p} style={{ padding: '0 16px 14px' }}>{f.a}</div>
        </details>
      ))}
    </Page>
  );
}
