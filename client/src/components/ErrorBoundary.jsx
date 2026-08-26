import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[ilcc] render error', error, info?.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    const base = import.meta.env.BASE_URL;
    return (
      <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif', color: 'var(--text, #ddd)', background: 'var(--bg1, #1a1c23)', minHeight: '100vh' }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: 'var(--text2, #999)', marginBottom: 16 }}>Your code is safe in this tab. Reload to continue, or report this if it keeps happening.</p>
        <pre style={{ padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 6, fontSize: 12, overflow: 'auto', maxWidth: 800 }}>{String(this.state.error?.stack || this.state.error)}</pre>
        <p style={{ marginTop: 16 }}>
          <a href={base} style={{ color: 'var(--accent, #f7a800)' }}>Reload</a>
          {' · '}
          <a href="https://github.com/ndg8743/web_ilcc/issues/new" target="_blank" rel="noreferrer" style={{ color: 'var(--accent, #f7a800)' }}>Report a bug</a>
        </p>
      </div>
    );
  }
}
