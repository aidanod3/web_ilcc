import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLabs } from '../context/LabsContext.jsx';

export default function LabModify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addLab, updateLab } = useLabs();
  const editingLab = location.state?.lab;

  const [labTitle, setLabTitle] = useState('');
  const [labChapter, setLabChapter] = useState('');
  const [description, setDescription] = useState('');
  const [questionIds, setQuestionIds] = useState([1, 2, 3]);
  const [questionValues, setQuestionValues] = useState({ 1: '', 2: '', 3: '' });
  const [nextId, setNextId] = useState(4);

  useEffect(() => {
    if (editingLab) {
      setLabTitle(editingLab.title ?? '');
      setLabChapter(editingLab.chapter ?? '');
      setDescription(editingLab.description ?? '');
      const questions = editingLab.questions ?? [];
      const ids = questions.map((_, i) => i + 1);
      const values = {};
      ids.forEach((id, i) => { values[id] = questions[i] ?? ''; });
      setQuestionIds(ids.length ? ids : [1]);
      setQuestionValues(ids.length ? values : { 1: '' });
      setNextId(ids.length + 1);
    }
  }, [editingLab]);

  function addQuestion() {
    setQuestionIds((ids) => [...ids, nextId]);
    setQuestionValues((v) => ({ ...v, [nextId]: '' }));
    setNextId((n) => n + 1);
  }

  function removeQuestion(id) {
    setQuestionIds((ids) => ids.filter((i) => i !== id));
    setQuestionValues((v) => {
      const next = { ...v };
      delete next[id];
      return next;
    });
  }

  function handleFinish() {
    const lab = {
      title: labTitle || 'Untitled Lab',
      chapter: Number(labChapter) || 0,
      description,
      questions: questionIds.map((id) => questionValues[id] ?? '').filter(Boolean)
    };
    if (editingLab?.id) {
      updateLab(editingLab.id, lab);
    } else {
      addLab(lab);
    }
    navigate('/lablist');
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f5f0e8',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <h1 style={{ margin: 0, marginBottom: '2rem', color: '#1e3a8a', textAlign: 'center', fontSize: '2.25rem' }}>
        {editingLab ? 'Edit Lab' : 'New Lab'}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '400px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem', color: '#374151' }}>
          Lab title
          <input
            type="text"
            placeholder="Lab title"
            value={labTitle}
            onChange={(e) => setLabTitle(e.target.value)}
            style={{
              padding: '0.6rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              background: '#ffffff'
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem', color: '#374151' }}>
          Chapter number
          <input
            type="number"
            placeholder="Chapter number"
            value={labChapter}
            onChange={(e) => setLabChapter(e.target.value)}
            style={{
              padding: '0.6rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              background: '#ffffff'
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem', color: '#374151' }}>
          Description
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              padding: '0.6rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '1rem',
              background: '#ffffff'
            }}
          />
        </label>
      </div>

      <h2 style={{ margin: '2rem 0 1rem', color: '#1e3a8a', fontSize: '1.25rem' }}>Questions for Lab:</h2>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '400px' }}>
        <ol
          style={{
            listStyle: 'decimal',
            paddingLeft: '1.5rem',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            width: '100%'
          }}
        >
          {questionIds.map((id, index) => (
            <li key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder={`Question ${index + 1}`}
                value={questionValues[id] ?? ''}
                onChange={(e) => setQuestionValues((v) => ({ ...v, [id]: e.target.value }))}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  background: '#ffffff'
                }}
              />
              <button
                type="button"
                onClick={() => removeQuestion(id)}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={addQuestion}
          style={{
            marginTop: '1rem',
            padding: '0.6rem 1.25rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            background: '#1e3a8a',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Add Question
        </button>
      </div>

      <button
        type="button"
        onClick={handleFinish}
        style={{
          marginTop: '2.5rem',
          padding: '0.75rem 2rem',
          fontSize: '1.1rem',
          fontWeight: 600,
          borderRadius: '10px',
          border: 'none',
          background: '#22c55e',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        Finish
      </button>
    </main>
  );
}
