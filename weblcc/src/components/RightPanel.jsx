export default function RightPanel({ activeTab, onTabChange, registers, stack, flags, memoryRows, eventLabel }) {
  return (
    <div className="panel panel--right">
      <div className="panel__tabs">
        <button
          type="button"
          className={activeTab === 'registers' ? 'tab is-active' : 'tab'}
          onClick={() => onTabChange('registers')}
        >
          Registers
        </button>
        <button
          type="button"
          className={activeTab === 'stack' ? 'tab is-active' : 'tab'}
          onClick={() => onTabChange('stack')}
        >
          Stack
        </button>
        <button
          type="button"
          className={activeTab === 'flags' ? 'tab is-active' : 'tab'}
          onClick={() => onTabChange('flags')}
        >
          Flags
        </button>
        <button
          type="button"
          className={activeTab === 'memory' ? 'tab is-active' : 'tab'}
          onClick={() => onTabChange('memory')}
        >
          Memory
        </button>
      </div>
      <div className="panel__body">
        {activeTab === 'registers' ? (
          <div className="register-grid">
            {registers.map((register) => (
              <div key={register.name} className="register">
                <span>{register.name.toUpperCase()}</span>
                <strong>{register.value}</strong>
              </div>
            ))}
          </div>
        ) : activeTab === 'stack' ? (
          <div className="stack-list">
            {stack.map((item, index) => (
              <div key={item.addr} className="stack-item">
                <span>{item.addr}</span>
                <strong>{item.value}</strong>
                <span className="stack-index">#{index}</span>
              </div>
            ))}
            <div className="stack-event">{eventLabel}</div>
          </div>
        ) : activeTab === 'flags' ? (
          <div className="flags-grid">
            {Object.entries(flags).map(([key, value]) => (
              <div key={key} className="flag-cell">
                <span>{key}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="memory-grid">
            <div className="memory-row memory-row--head">
              <span>Addr</span>
              <span>+0</span>
              <span>+1</span>
              <span>+2</span>
              <span>+3</span>
            </div>
            {memoryRows.map((row) => (
              <div key={row.addr} className="memory-row">
                <span>{row.addr}</span>
                {row.cells.map((cell, index) => (
                  <span key={`${row.addr}-${index}`}>{cell}</span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
