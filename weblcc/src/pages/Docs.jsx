import { useNavigate } from 'react-router-dom';

export default function Docs() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0d11',
      color: '#e2e2e5',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,.07)',
        position: 'sticky', top: 0, background: '#0b0d11', zIndex: 10,
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#8a8a96', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0, fontFamily: 'inherit' }}>←</button>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Documentation</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#5b5f6a', fontSize: 14 }}>Coming soon.</p>
      </div>
    </div>
  );
}
