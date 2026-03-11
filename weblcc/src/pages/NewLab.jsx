import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NewLab() {
  const navigate = useNavigate();
  const [labTitle, setLabTitle] = useState('');
  const [labChapter, setLabChapter] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([
    { title: '', expectedOutputFile: null, fileType: '' },
    { title: '', expectedOutputFile: null, fileType: '' },
    { title: '', expectedOutputFile: null, fileType: '' }
  ]);

  const labFilled =
    labTitle.trim() !== '' &&
    String(labChapter).trim() !== '' &&
    description.trim() !== '';
  const allQuestionsFilled = questions.every(
    (q) =>
      q.title.trim() !== '' &&
      q.expectedOutputFile != null &&
      q.fileType.trim() !== ''
  );
  const canFinish = labFilled && allQuestionsFilled;

  return (
    <main
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: '100vh',
        paddingTop: '4rem',
        gap: '1.5rem',
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
          background: '#93c5fd',
          color: '#1e3a8a'
        }}
      >
        ← Back
      </button>
      <h1 style={{ textAlign: 'center' }}>Create Lab</h1>

      <form
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          width: '60%',
          minWidth: '260px',
          maxWidth: '640px'
        }}
      >
        <input
          type="text"
          placeholder="Lab title"
          value={labTitle}
          onChange={(e) => setLabTitle(e.target.value)}
          style={{ width: '100%', padding: '0.5rem 0.75rem' }}
        />
        <input
          type="number"
          placeholder="Lab chapter number"
          value={labChapter}
          onChange={(e) => setLabChapter(e.target.value)}
          style={{ width: '100%', padding: '0.5rem 0.75rem' }}
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: '100%', padding: '0.5rem 0.75rem' }}
        />
      </form>

      <section
        style={{
          width: '60%',
          minWidth: '260px',
          maxWidth: '640px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        <h2 style={{ margin: 0, textAlign: 'left' }}>Questions for Lab:</h2>

        <ol
          style={{
            listStyle: 'decimal',
            paddingLeft: '1.5rem',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          {questions.map((q, index) => (
            <li
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                padding: '0.35rem 0',
                borderRadius: '6px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center'
                }}
              >
                <input
                  type="text"
                  placeholder={`Question ${index + 1} title`}
                  value={q.title}
                  onChange={(e) =>
                    setQuestions((prev) => {
                      const next = [...prev];
                      next[index] = { ...next[index], title: e.target.value };
                      return next;
                    })
                  }
                  style={{ flex: 2, padding: '0.5rem 0.75rem' }}
                />
                <button
                  type="button"
                  onClick={() =>
                    setQuestions((prev) => prev.filter((_, i) => i !== index))
                  }
                  style={{ paddingInline: '0.8rem', background: '#ef4444', color: 'white' }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    key={`expected-output-${index}-${q.expectedOutputFile ? 'set' : 'empty'}`}
                    id={`expected-output-${index}`}
                    type="file"
                    accept="*/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        setQuestions((prev) => {
                          const next = [...prev];
                          next[index] = { ...next[index], expectedOutputFile: file };
                          return next;
                        });
                    }}
                  />
                  <label
                    htmlFor={`expected-output-${index}`}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: '#f8fafc',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Upload expected output
                  </label>
                  <span style={{ fontSize: '0.9rem', color: '#555' }}>
                    {q.expectedOutputFile ? q.expectedOutputFile.name : 'No file chosen'}
                  </span>
                  {q.expectedOutputFile && (
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions((prev) => {
                          const next = [...prev];
                          next[index] = { ...next[index], expectedOutputFile: null };
                          return next;
                        })
                      }
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                    >
                      Clear file
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="File type (.e, .a, .c)"
                  value={q.fileType}
                  onChange={(e) =>
                    setQuestions((prev) => {
                      const next = [...prev];
                      next[index] = { ...next[index], fileType: e.target.value };
                      return next;
                    })
                  }
                  style={{ flex: 1.2, padding: '0.5rem 0.75rem' }}
                />
              </div>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() =>
            setQuestions((prev) => [
              ...prev,
              { title: '', expectedOutputFile: null, fileType: '' }
            ])
          }
          style={{ alignSelf: 'flex-start', marginTop: '0.75rem', background: '#93c5fd', color: '#1e3a8a' }}
        >
          Add Question
        </button>

        <button
          type="button"
          disabled={!canFinish}
          onClick={() => {
            if (canFinish) {
              // TODO: submit lab (e.g. navigate or API call)
            }
          }}
          style={{
            alignSelf: 'center',
            marginTop: '1.5rem',
            padding: '0.75rem 2rem',
            fontSize: '1.15rem',
            background: '#22c55e',
            color: 'white'
          }}
        >
          Finish
        </button>
      </section>
    </main>
  );
}