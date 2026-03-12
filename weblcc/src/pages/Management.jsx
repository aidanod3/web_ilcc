import { useState } from 'react';
import npLogo from './Images/npLogo.png';

export default function Management() {
  const [hoveredName, setHoveredName] = useState(null);
  const totalNames = 7;

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
            justifyContent: 'space-between',
            minHeight: '460px'
          }}
        >
          <div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredName(n)}
                    onMouseLeave={() => setHoveredName(null)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      background: hoveredName === n ? '#dbeafe' : '#f3f4f6',
                      color: '#111827'
                    }}
                  >
                    {`Name ${n}`}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div
              style={{
                height: '18px',
                borderRadius: '999px',
                background: '#e5e7eb',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.75rem'
              }}
            >
              <div
                style={{
                  width: '0%',
                  height: '100%',
                  background: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                0/{totalNames}
              </div>
            </div>
          </div>
        </section>

        {/* Center 2x2 grid */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'minmax(340px, 1fr) minmax(80px, 0.5fr)',
            gap: '2rem'
          }}
        >
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.1rem',
                boxShadow: '0 18px 40px -30px rgba(15, 23, 42, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: index < 2 ? '340px' : '80px'
              }}
            >
              {index === 2 && (
                <textarea
                  placeholder="Test cases..."
                  style={{
                    width: '100%',
                    height: '100%',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    resize: 'none',
                    fontFamily:
                      '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: '0.85rem',
                    background: '#f9fafb'
                  }}
                />
              )}

              {index === 3 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    width: '100%',
                    height: '100%'
                  }}
                >
                  <pre
                    style={{
                      width: '100%',
                      flex: 1,
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '0.35rem 0.6rem',
                      margin: 0,
                      fontFamily:
                        '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      fontSize: '0.8rem',
                      background: '#f9fafb',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    Output...
                  </pre>
                  <pre
                    style={{
                      width: '100%',
                      flex: 1,
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '0.35rem 0.6rem',
                      margin: 0,
                      fontFamily:
                        '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      fontSize: '0.8rem',
                      background: '#f9fafb',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    Expected output...
                  </pre>
                </div>
              )}
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
            justifyContent: 'flex-start',
            minHeight: '460px'
          }}
        >
          <span
            style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#111827'
            }}
          >
            Score: 0/20
          </span>
          <div style={{ marginTop: '1rem', width: '100%' }}>
            <div
              style={{
                marginBottom: '0.35rem',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#374151'
              }}
            >
              Deductions:
            </div>
            <textarea
              placeholder="Explain point deductions..."
              style={{
                width: '100%',
                minHeight: '140px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                resize: 'none',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                background: '#f9fafb'
              }}
            />
          </div>

          <div style={{ marginTop: '1rem', width: '100%' }}>
            <div
              style={{
                marginBottom: '0.35rem',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#374151'
              }}
            >
              Message to Student:
            </div>
            <textarea
              placeholder="Write feedback for the student..."
              style={{
                width: '100%',
                minHeight: '140px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                resize: 'none',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                background: '#f9fafb'
              }}
            />
          </div>

          <div
            style={{
              marginTop: '1.25rem',
              width: '100%',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}
          >
            <button
              type="button"
              style={{
                padding: '0.45rem 1.1rem',
                borderRadius: '999px',
                border: '1px solid #d1d5db',
                background: '#f3f4f6',
                color: '#111827',
                fontSize: '0.9rem',
                fontWeight: 500
              }}
            >
              Skip
            </button>
            <button
              type="button"
              style={{
                padding: '0.45rem 1.3rem',
                borderRadius: '999px',
                border: 'none',
                background: '#22c55e',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              Save &amp; Next
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}