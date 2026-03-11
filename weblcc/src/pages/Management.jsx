import { useNavigate } from 'react-router-dom';
import npLogo from './Images/npLogo.png';

export default function Management() {
  const navigate = useNavigate();

  return (
    <main className="page">
      <header className="page__header">
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <img
            src={npLogo}
            alt="TA Management logo"
            style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '10px' }}
          />
          <h1>TA Management</h1>
        </div>
        <p>Select an option below.</p>
      </header>

      <section className="panel management-options">
        <button
          type="button"
          className="management-option"
          onClick={() => navigate('/newlab')}
        >
          <span className="management-option__label">New Lab</span>
          <span className="management-option__hint">Create and configure a new lab.</span>
        </button>

        <button
          type="button"
          className="management-option"
          onClick={() => navigate('/labgrade')}
        >
          <span className="management-option__label">Grade Lab</span>
          <span className="management-option__hint">Review and grade student submissions.</span>
        </button>
      </section>
    </main>
  );
}