import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLabs } from '../context/LabsContext.jsx';

export default function LabList() {
  const navigate = useNavigate();
  const { labs } = useLabs();
  const [selectedLab, setSelectedLab] = useState(null);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      <button
        type="button"
        onClick={() => navigate('/management')}
        style={{
          position: 'absolute',
          left: '1rem',
          top: '1rem',
          padding: '0.5rem 1rem',
          fontSize: '0.95rem',
          fontWeight: 500,
          borderRadius: '8px',
          border: 'none',
          background: '#93c5fd',
          color: '#1e3a8a',
          cursor: 'pointer'
        }}
      >
        ← Back
      </button>
      <h1 style={{ margin: 0, marginBottom: '2rem', color: '#111827', textAlign: 'center' }}>Lab List</h1>

      <div
        style={{
          display: 'flex',
          gap: '2rem',
          flex: 1,
          minHeight: 'calc(100vh - 8rem)',
          width: '100%',
          maxWidth: '1200px',
          alignSelf: 'center'
        }}
      >
        <div
          style={{
            width: '280px',
            flexShrink: 0,
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          {labs.map((lab) => (
            <button
              key={lab.id}
              type="button"
              onClick={() => setSelectedLab(lab)}
              style={{
                padding: '0.6rem 0.75rem',
                textAlign: 'left',
                border: 'none',
                borderRadius: '8px',
                background: selectedLab?.id === lab.id ? '#dbeafe' : '#f3f4f6',
                color: '#111827',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              {lab.title}
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate('/labmodify')}
            style={{
              marginTop: '0.5rem',
              padding: '0.6rem',
              border: 'none',
              borderRadius: '8px',
              background: '#22c55e',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.25rem',
              fontWeight: 600
            }}
          >
            +
          </button>
        </div>

        <div
          style={{
            flex: 1,
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            minWidth: 0
          }}
        >
          {selectedLab ? (
            <div style={{ color: '#374151' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{selectedLab.title}</h2>
                <button
                  type="button"
                  onClick={() => navigate('/labmodify', { state: { lab: selectedLab } })}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    borderRadius: '8px',
                    border: 'none',
                    background: '#1e3a8a',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
              </div>
              <p style={{ margin: '0 0 0.5rem' }}><strong>Chapter:</strong> {selectedLab.chapter}</p>
              <p style={{ margin: '0 0 1rem' }}><strong>Description:</strong> {selectedLab.description || '—'}</p>
              {selectedLab.questions?.length > 0 && (
                <>
                  <strong>Questions:</strong>
                  <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                    {selectedLab.questions.map((q, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{q}</li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#9ca3af' }}>Select a lab to view its content, or click + to create one.</p>
          )}
        </div>
      </div>
    </main>
  );
}
