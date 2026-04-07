import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0d11',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: '#e2e2e5',
    }}>
      {/* top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,.07)',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#8a8a96', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0, fontFamily: 'inherit' }}
        >←</button>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Settings</span>
      </div>

      <div style={{ flex: 1, maxWidth: 640, margin: '0 auto', padding: '40px 24px', width: '100%' }}>
        <Section title="Editor Theme">
          <p style={{ color: '#8a8a96', fontSize: 13, lineHeight: 1.6 }}>
            Themes are available in the Code Editor via the theme selector in the top-right toolbar.
            Choose from <strong style={{ color: '#e2e2e5' }}>Dark</strong>, <strong style={{ color: '#e2e2e5' }}>Light</strong>, <strong style={{ color: '#e2e2e5' }}>Midnight</strong>, <strong style={{ color: '#e2e2e5' }}>Dracula</strong>, or <strong style={{ color: '#e2e2e5' }}>Monokai</strong>.
          </p>
          <button onClick={() => navigate('/ilcc')} style={btnStyle}>Open Editor to change theme</button>
        </Section>

        <Section title="Custom Keywords">
          <p style={{ color: '#8a8a96', fontSize: 13, lineHeight: 1.6 }}>
            Add your own mnemonics or labels for syntax highlighting. Access the <strong style={{ color: '#e2e2e5' }}>Keywords</strong> button in the Code Editor toolbar to manage custom tokens — they will be highlighted in yellow in your code.
          </p>
          <button onClick={() => navigate('/ilcc')} style={btnStyle}>Open Editor to manage keywords</button>
        </Section>

        <Section title="Smart Error Detection">
          <p style={{ color: '#8a8a96', fontSize: 13, lineHeight: 1.6 }}>
            The editor automatically detects common issues as you type:
          </p>
          <ul style={{ color: '#8a8a96', fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
            <li><span style={{ color: '#ef4444' }}>⛔ Errors</span> — Unknown instructions, branches to undefined labels</li>
            <li><span style={{ color: '#fbbf24' }}>⚠ Warnings</span> — Uninitialized registers, stack underflow, possible infinite loops</li>
          </ul>
          <p style={{ color: '#8a8a96', fontSize: 13 }}>Issues appear as icons in the editor gutter and in the panel below the code.</p>
        </Section>

        <Section title="Code Templates">
          <p style={{ color: '#8a8a96', fontSize: 13, lineHeight: 1.6 }}>
            Use the <strong style={{ color: '#e2e2e5' }}>Code Templates</strong> dropdown in the editor to load prebuilt programs:
            Add Two Numbers, Count Loop, While Loop, If/Else, Stack &amp; Function Call, String I/O, Array, Fibonacci, and Recursive Factorial.
          </p>
        </Section>

        <Section title="About WebLCC">
          <p style={{ color: '#8a8a96', fontSize: 13, lineHeight: 1.6 }}>
            WebLCC is an in-browser IDE for the LCC (Little Computer Compiler) assembly language used in CPS340 at SUNY New Paltz. It supports step-by-step tracing, breakpoints, register/memory inspection, and more.
          </p>
        </Section>
      </div>
    </div>
  );
}

const btnStyle = {
  marginTop: 12,
  background: 'rgba(247,168,0,.12)',
  border: '1px solid rgba(247,168,0,.25)',
  borderRadius: 8,
  padding: '9px 18px',
  color: '#f7a800',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'inherit',
};

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#e2e2e5', marginBottom: 12, letterSpacing: '.04em', textTransform: 'uppercase' }}>
        {title}
      </h2>
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}
