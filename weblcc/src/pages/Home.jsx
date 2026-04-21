import { useNavigate } from 'react-router-dom';

/* ─── Bottom nav items ──────────────────────────────────────── */
const NAV_ITEMS = [
  {
    id: 'docs',
    label: 'Documentation',
    path: '/docs',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="13" y2="11"/>
      </svg>
    ),
  },
  {
    id: 'editor',
    label: 'Code Editor',
    path: '/ilcc',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

/* ─── Fake blurred editor background ───────────────────────── */
const BG_LINES = [
  '; Fibonacci sequence',
  'startup:    bl   main',
  '            halt',
  '',
  'main:       push lr',
  '            push fp',
  '            mov  fp, sp',
  '            mov  r0, 0',
  '            mov  r1, 1',
  '            mov  r3, 0',
  'fibLoop:    cmp  r3, r4',
  '            brp  fibDone',
  '            dout r0',
  '            nl',
  '            add  r2, r0, r1',
  '            mov  r0, r1',
  '            mov  r1, r2',
  '            add  r3, r3, 1',
  '            br   fibLoop',
  'fibDone:    mov  sp, fp',
  '            pop  fp',
  '            pop  lr',
  '            ret',
  '',
  'prompt:     .string "Enter N: "',
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#13151a',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      userSelect: 'none',
    }}>

      {/* ── Blurred editor mockup background ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        display: 'flex', alignItems: 'stretch',
      }}>
        {/* left panel: gutter + code */}
        <div style={{
          flex: 1, display: 'flex', overflow: 'hidden',
          opacity: 0.18, filter: 'blur(2.5px)',
          fontFamily: "'JetBrains Mono','Fira Code',monospace",
          fontSize: 13, lineHeight: '22px',
          paddingTop: 80,
        }}>
          {/* gutter */}
          <div style={{ width: 44, paddingRight: 8, textAlign: 'right', color: '#4a4f60', flexShrink: 0 }}>
            {BG_LINES.map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          {/* code */}
          <div style={{ paddingLeft: 12, color: '#4a5568', whiteSpace: 'pre' }}>
            {BG_LINES.map((line, i) => (
              <div key={i} style={{
                color: line.startsWith(';') ? '#3d4a5e'
                  : line.includes(':') && !line.trim().startsWith('.') && !line.includes('bl ') && !line.includes('cmp') && !line.includes('br') ? '#3a5a4a'
                  : '#3d4560',
              }}>{line || ' '}</div>
            ))}
          </div>
        </div>
        {/* right panel filler */}
        <div style={{ width: '38%', background: 'rgba(255,255,255,.015)', borderLeft: '1px solid rgba(255,255,255,.04)' }} />

        {/* gradient fade-in overlay so background doesn't compete with hero */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(19,21,26,.92) 30%, rgba(19,21,26,.6) 100%)',
        }} />

        {/* subtle accent glow */}
        <div style={{
          position: 'absolute', top: '10%', left: '20%',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(247,168,0,.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '15%',
          width: 400, height: 300,
          background: 'radial-gradient(ellipse, rgba(79,216,255,.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      {/* ── Top navigation bar ── */}
      <nav style={{
        position: 'relative', zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 56,
        borderBottom: '1px solid rgba(255,255,255,.06)',
        background: 'rgba(19,21,26,.7)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 7,
            background: 'linear-gradient(135deg, #f7a800 0%, #ff5f35 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 15, color: '#0d0d0d',
            fontFamily: 'system-ui, sans-serif',
          }}>L</div>
          <span style={{ color: '#e0e0e8', fontWeight: 600, fontSize: 14, letterSpacing: '.02em' }}>WebLCC</span>
        </div>

        {/* Center links */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[['Docs', '/docs'], ['Editor', '/ilcc'], ['Settings', '/settings']].map(([label, path]) => (
            <button key={label} onClick={() => navigate(path)} style={{
              background: 'none', border: 'none',
              color: '#9a9ab0', fontSize: 13, fontWeight: 500,
              padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
              transition: 'color .15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#e0e0e8'; e.currentTarget.style.background = 'rgba(255,255,255,.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9a9ab0'; e.currentTarget.style.background = 'none'; }}
            >{label}</button>
          ))}
        </div>

        {/* Right: GitHub star */}
        <a
          href="https://github.com/aidanod3/web_ilcc"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 8, padding: '6px 14px',
            color: '#e0e0e8', fontSize: 12, fontWeight: 600,
            textDecoration: 'none', letterSpacing: '.03em',
            transition: 'background .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          Star on GitHub
        </a>
      </nav>

      {/* ── Hero ── */}
      <div style={{
        flex: 1, position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '0 24px',
        gap: 0,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 'clamp(2.2rem, 5.5vw, 4rem)',
          fontWeight: 700,
          color: '#e8e8f0',
          lineHeight: 1.18,
          letterSpacing: '-.03em',
        }}>
          The all in one web IDE for
          <br />
          <span style={{ color: '#e8e8f0' }}>Assembly </span>
          <span style={{
            fontSize: 'clamp(.95rem, 2vw, 1.45rem)',
            fontWeight: 400,
            color: '#6b7280',
            letterSpacing: '0',
          }}>LCC · CPS330</span>
        </h1>

        {/* CTA row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 44 }}>
          {/* GitHub icon btn */}
          <a
            href="https://github.com/aidanod3/web_ilcc"
            target="_blank"
            rel="noreferrer"
            style={{
              width: 44, height: 44, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,.07)',
              border: '1px solid rgba(255,255,255,.12)',
              color: '#c0c0d0',
              textDecoration: 'none',
              transition: 'background .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.13)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.07)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>

          {/* Primary CTA */}
          <button
            onClick={() => navigate('/ilcc')}
            style={{
              height: 44,
              padding: '0 26px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #f7a800 0%, #ff6025 100%)',
              border: 'none',
              color: '#0d0d0d',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 0 28px rgba(247,168,0,.28)',
              fontFamily: 'inherit',
              letterSpacing: '.02em',
              transition: 'transform .15s, box-shadow .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 36px rgba(247,168,0,.38)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 28px rgba(247,168,0,.28)'; }}
          >
            Launch Editor
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>

        {/* Secondary CTA */}
        <button
          onClick={() => navigate('/docs')}
          style={{
            marginTop: 16,
            background: 'none', border: 'none',
            color: '#6b7280', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', borderRadius: 6,
            fontFamily: 'inherit',
            transition: 'color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#c0c0d0'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; }}
        >
          View documentation
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </button>
      </div>

      {/* ── Bottom nav bar (like the screenshot) ── */}
      <div style={{ position: 'relative', zIndex: 20 }}>
        {/* thin rainbow gradient line */}
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, #f7a800 0%, #ff5f35 25%, #bd93f9 50%, #4fd8ff 75%, #3ddc84 100%)',
        }} />

        <div style={{
          display: 'flex',
          background: 'rgba(13,14,18,.9)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,.06)',
        }}>
          {NAV_ITEMS.map((item, i) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 7, padding: '22px 16px 20px',
                background: 'transparent', border: 'none',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,.05)' : 'none',
                cursor: 'pointer',
                color: '#6b7280',
                fontFamily: 'inherit',
                transition: 'color .15s, background .15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#e0e0e8';
                e.currentTarget.style.background = 'rgba(255,255,255,.04)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#6b7280';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '.01em' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
