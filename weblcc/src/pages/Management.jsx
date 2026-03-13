import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Management() {
  const navigate = useNavigate();
  const [hoverAutograder, setHoverAutograder] = useState(false);
  const [hoverCreateLabs, setHoverCreateLabs] = useState(false);

  return (
    <main
      className="page"
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem'
      }}
    >
      <h1 style={{ textAlign: 'center', padding: '2rem 0', margin: 0, color: '#111827', fontSize: '1.75rem' }}>
        TA management page
      </h1>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            padding: '2.5rem',
            background: '#ffffff',
            borderRadius: '18px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/autograder')}
            onMouseEnter={() => setHoverAutograder(true)}
            onMouseLeave={() => setHoverAutograder(false)}
            style={{
              padding: '1.25rem 2.5rem',
              fontSize: '1.15rem',
              fontWeight: 600,
              borderRadius: '12px',
              border: 'none',
              background: hoverAutograder ? '#2563eb' : '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              minWidth: '220px'
            }}
          >
            Autograder
          </button>
          <button
            type="button"
            onClick={() => navigate('/newlab')}
            onMouseEnter={() => setHoverCreateLabs(true)}
            onMouseLeave={() => setHoverCreateLabs(false)}
            style={{
              padding: '1.25rem 2.5rem',
              fontSize: '1.15rem',
              fontWeight: 600,
              borderRadius: '12px',
              border: 'none',
              background: hoverCreateLabs ? '#16a34a' : '#22c55e',
              color: 'white',
              cursor: 'pointer',
              minWidth: '220px'
            }}
          >
            Create Labs
          </button>
        </div>
      </div>
    </main>
  );
}