export default function EditorPanel({ isTracing, lines, activeLine, source, onSourceChange }) {
  return (
    <div className="panel panel--editor">
      <div className="panel__header">
        <span>Assembly Source</span>
      </div>
      <div className="panel__body">
        {isTracing ? (
          <div className="code-display">
            {lines.map((line, index) => (
              <div
                key={`line-${index}`}
                className={index === activeLine ? 'code-line is-active' : 'code-line'}
              >
                <span className="code-line__number">{index + 1}</span>
                <span className="code-line__text">{line || ' '}</span>
              </div>
            ))}
          </div>
        ) : (
          <textarea
            className="editor__textarea"
            value={source}
            onChange={(event) => onSourceChange(event.target.value)}
            spellCheck="false"
          />
        )}
      </div>
    </div>
  );
}
