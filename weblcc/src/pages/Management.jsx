import npLogo from './Images/npLogo.png';

export default function Management() {
  return (
    <main className="page">
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          display: 'grid',
          gridTemplateColumns: '0.7fr 1.8fr 0.7fr',
          gap: '2rem',
          alignItems: 'stretch'
        }}
      >
        {/* Left tall panel */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 18px 40px -30px rgba(15, 23, 42, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '460px'
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}></h2>
          <p style={{ margin: 0 }}></p>
        </section>

        {/* Center 2x2 grid */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridAutoRows: 'minmax(180px, 1fr)',
            gap: '1.5rem'
          }}
        >
          {['', '', '', ''].map((title) => (
            <div
              key={title}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.1rem',
                boxShadow: '0 18px 40px -30px rgba(15, 23, 42, 0.6)',
                display: 'flex',
                flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '180px'
              }}
            >
              <h3 style={{ margin: 0, marginBottom: '0.4rem' }}>{title}</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563' }}>
                Placeholder content for {title.toLowerCase()}.
              </p>
            </div>
          ))}
        </section>

        {/* Right tall panel */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 18px 40px -30px rgba(15, 23, 42, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '460px'
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}></h2>
          <p style={{ margin: 0 }}></p>
        </section>
      </div>
    </main>
  );
}