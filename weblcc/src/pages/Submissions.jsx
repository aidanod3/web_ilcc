export default function Submissions() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <h1
        style={{
          margin: 0,
          marginBottom: '2rem',
          color: '#111827',
          textAlign: 'center',
          fontSize: '1.75rem'
        }}
      >
        Submissions
      </h1>

      <section
        style={{
          width: '100%',
          maxWidth: '800px',
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
        }}
      >
        <h2 style={{ margin: 0, marginBottom: '1rem', color: '#111827', fontSize: '1.25rem' }}>
          Completed Labs
        </h2>
        <p style={{ margin: 0, color: '#9ca3af' }}>
          Completed lab submissions will appear here.
        </p>
      </section>
    </main>
  );
}
