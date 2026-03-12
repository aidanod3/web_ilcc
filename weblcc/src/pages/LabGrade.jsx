import { useState } from 'react';

export default function LabGrade() {
  const labs = [
    { id: 'lab1', name: 'Lab 1', chapter: 1, description: 'Introduction to ILCC', questions: 3 },
    { id: 'lab2', name: 'Lab 2', chapter: 2, description: 'Control flow and branching', questions: 4 },
    { id: 'lab3', name: 'Lab 3', chapter: 3, description: 'Memory and arrays', questions: 5 },
    { id: 'lab4', name: 'Lab 4', chapter: 4, description: 'I/O and traps', questions: 2 }
  ];
  const [activeLabId, setActiveLabId] = useState(labs[0]?.id ?? null);

  const activeLab = labs.find((lab) => lab.id === activeLabId) ?? null;

  return (
    <main
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: '100vh',
        paddingTop: 0,
        gap: '1.5rem'
      }}
    >
      <h1 style={{ textAlign: 'center' }}>Grade Labs</h1>
      
      <div
        style={{
          width: '100%',
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'flex-start'
        }}
      >
        <section
          style={{
            width: '260px',
            background: '#ffffff',
            padding: '1.25rem',
            boxShadow: '0 10px 30px -20px rgba(15, 23, 42, 0.5)',
            minHeight: 'calc(100vh - 4rem)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start'
          }}
        >
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            {labs.map((lab) => (
              <li key={lab.id}>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    background: lab.id === activeLabId ? '#bfdbfe' : '#e0f2fe',
                    color: '#1e3a8a',
                    borderRadius: '4px'
                  }}
                  onClick={() => setActiveLabId(lab.id)}
                >
                  {lab.name}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {activeLab && (
          <section
            style={{
              flex: 1,
              maxWidth: '640px',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 10px 30px -20px rgba(15, 23, 42, 0.4)'
            }}
          >
            <h2 style={{ marginTop: 0 }}>{activeLab.name}</h2>
            <p style={{ margin: '0.25rem 0' }}>
              <strong>Chapter:</strong> {activeLab.chapter}
            </p>
            <p style={{ margin: '0.25rem 0 0.75rem' }}>
              <strong>Description:</strong> {activeLab.description}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Questions:</strong> {activeLab.questions}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}