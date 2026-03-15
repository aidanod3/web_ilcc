import React, { useState, useRef, useEffect } from "react";
import "./Autograder.css";

const STUDENTS = [
  { id: 1, name: "Student Name", status: "Graded" },
  { id: 2, name: "Student Name", status: "Graded" },
  { id: 3, name: "Student Name", status: "InProg" },
  { id: 4, name: "Student Name", status: "Ungraded" },
  { id: 5, name: "Student Name", status: "Ungraded" },
  { id: 6, name: "Student Name", status: "Ungraded" },
  { id: 7, name: "Student Name", status: "Late" },
  { id: 8, name: "Student Name", status: "NoSub" },
];

const STATUS_META = {
  Graded:   { color: "#22c55e", label: "Graded",   bg: "#f0fff4" },
  InProg:   { color: "#f59e0b", label: "In Prog",  bg: "#fffbeb" },
  Ungraded: { color: "#94a3b8", label: "Ungraded", bg: "#f8fafc" },
  Late:     { color: "#ef4444", label: "Late",     bg: "#fff5f5" },
  NoSub:    { color: "#ef4444", label: "No Sub",   bg: "#fff5f5" },
};

// ── SVG Icons ──────────────────────────────────────────
const IconMoon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>;
const IconSun     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IconImport  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconExport  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IconPlus    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconTrash   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;

export default function Autograder() {
  const [selectedStudent, setSelectedStudent] = useState(0);
  const [code, setCode] = useState(`c0605.a\n\nmain:\n    push lr\n    push fp\n    mov fp, sp\n    ; load values\n    mov r1, 5`);
  const [reference] = useState(`c0605_sol.a\n\nmain:\n    push lr\n    push fp\n    mov fp, sp\n    ; setup frame\n    mov r1, 5`);
  const [input, setInput] = useState("5 10 -3");
  const [expected, setExpected] = useState("15 -30");
  const [actual, setActual] = useState("");
  const [score, setScore] = useState(18);
  const [maxScore, setMaxScore] = useState(20);
  const [deductions, setDeductions] = useState([
    { id: 1, pts: -1, reason: "Q3 pcoffset off-by-one" },
    { id: 2, pts: -1, reason: "Q5 wrong epilogue order" },
  ]);
  const [message, setMessage] = useState("Good work! Check pcoffset in Q3 (+1 for PC advance). Fix epilogue in Q5: mov sp,fp before pops.");
  const [isChecking, setIsChecking] = useState(false);
  const [mismatchLine, setMismatchLine] = useState(2);
  const [search, setSearch] = useState("");
  const [autoSaved, setAutoSaved] = useState("2s ago");
  const [fileLoading, setFileLoading] = useState(false);
  const [dark, setDark] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ bottom: 18, right: 18 });
  const dragRef = useRef(null);
  const importRef = useRef(null);

  // ── Toolbar drag ──────────────────────────────────────
  const handleToolbarMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('label')) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startRight = toolbarPos.right, startBottom = toolbarPos.bottom;
    const onMove = (mv) => setToolbarPos({
      right:  Math.max(0, startRight  - (mv.clientX - startX)),
      bottom: Math.max(0, startBottom - (mv.clientY - startY)),
    });
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Import grades JSON ────────────────────────────────
  const handleImport = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.score   !== undefined) setScore(data.score);
        if (data.maxScore !== undefined) setMaxScore(data.maxScore);
        if (data.deductions) setDeductions(data.deductions.map((d, i) => ({ ...d, id: i + 1 })));
        if (data.message) setMessage(data.message);
        if (data.expected) setExpected(data.expected);
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  // ── Export grades JSON ────────────────────────────────
  const handleExport = () => {
    const data = { score, maxScore, deductions, message, expected };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `grade_student${selectedStudent + 1}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ── Student code file upload ──────────────────────────
  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFileLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => { setCode(String(ev.target.result || "")); setFileLoading(false); };
    reader.onerror = () => setFileLoading(false);
    reader.readAsText(f);
  };

  // ── Run code ──────────────────────────────────────────
  const handleCheck = async () => {
    setIsChecking(true);
    setActual("");
    setMismatchLine(null);
    try {
      const payload = { source: code };
      const candidates = ['/api/run'];
      let finalData = null, lastError = null;
      for (const url of candidates) {
        try {
          const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const raw  = await resp.text().catch(() => '');
          let data;
          try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = { _rawText: raw }; }
          if (resp.ok) { finalData = data; break; }
          lastError = { status: resp.status, detail: String(data?.error || `HTTP ${resp.status}`) };
        } catch (err) { lastError = { status: 0, detail: err.message || 'Network error' }; }
      }
      if (finalData) {
        if (finalData.error) {
          setActual(`Error: ${finalData.error}`);
        } else {
          const result = (finalData.stdout || '').trim() || (finalData.stderr || '').trim() || 'No output.';
          setActual(result);
          const expLines = expected.split('\n'), actLines = result.split('\n');
          let mLine = null;
          for (let i = 0; i < Math.max(expLines.length, actLines.length); i++) {
            if ((expLines[i] || '') !== (actLines[i] || '')) { mLine = i + 1; break; }
          }
          setMismatchLine(mLine);
        }
      } else {
        setActual(lastError?.detail || 'Unable to reach backend.');
      }
    } catch (error) { setActual(String(error)); }
    finally { setIsChecking(false); }
  };

  // ── Deduction helpers ─────────────────────────────────
  const addDeduction = () =>
    setDeductions(prev => [...prev, { id: Date.now(), pts: -1, reason: "" }]);

  const updateDeduction = (id, field, val) =>
    setDeductions(prev => prev.map(d => d.id === id ? { ...d, [field]: field === 'pts' ? Number(val) : val } : d));

  const removeDeduction = (id) =>
    setDeductions(prev => prev.filter(d => d.id !== id));

  // ── Save & next ───────────────────────────────────────
  const handleSaveNext = () => {
    setAutoSaved("just now");
    setTimeout(() => setAutoSaved("2s ago"), 2000);
    setSelectedStudent(prev => (prev + 1) % STUDENTS.length);
  };

  const matched = actual && expected && actual.trim() === expected.trim();
  const totalDeducted = deductions.reduce((sum, d) => sum + (Number(d.pts) || 0), 0);

  // Auto-calculate score whenever deductions or maxScore change
  useEffect(() => {
    setScore(maxScore + totalDeducted);
  }, [deductions, maxScore]);

  const filtered = STUDENTS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.status.toLowerCase().includes(search.toLowerCase())
  );
  const gradedCount = STUDENTS.filter(s => s.status === "Graded").length;

  return (
    <div className={`ag-root${dark ? ' ag-dark' : ''}`}>

      {/* ── Floating toolbar ─────────────────────────── */}
      <div
        className="ag-toolbar"
        ref={dragRef}
        onMouseDown={handleToolbarMouseDown}
        style={{ bottom: toolbarPos.bottom, right: toolbarPos.right }}
        title="Drag to move"
      >
        {/* Dark / Light toggle */}
        <button
          className="ag-toolbar-btn"
          onClick={() => setDark(d => !d)}
          title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {dark ? <IconSun /> : <IconMoon />}
        </button>

        <div className="ag-toolbar-divider" />

        {/* Import */}
        <label className="ag-toolbar-btn" title="Import grades (JSON)">
          <IconImport />
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </label>

        {/* Export */}
        <button className="ag-toolbar-btn" onClick={handleExport} title="Export grades (JSON)">
          <IconExport />
        </button>

        <div className="ag-toolbar-divider" />

        {/* LCC switch */}
        <button
          className="ag-toolbar-btn ag-toolbar-lcc"
          onClick={() => window.location.href = '/main'}
          title="Switch to LCC Emulator"
        >
          LCC
        </button>
      </div>

      {/* ── Panel 1: Students ────────────────────────── */}
      <div className="ag-panel ag-students">
        <div className="ag-panel-header">Panel 1: Students</div>
        <input className="ag-search" placeholder="Search / Filter" value={search} onChange={e => setSearch(e.target.value)} />
        <ul className="ag-student-list">
          {filtered.map((s, i) => {
            const meta = STATUS_META[s.status];
            return (
              <li key={s.id} className={`ag-student-item ${selectedStudent === i ? 'ag-student-selected' : ''}`} onClick={() => setSelectedStudent(i)}>
                <span className="ag-dot" style={{ color: meta.color }}>●</span>
                <span className="ag-student-name">{s.name}</span>
                <span className="ag-status-badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
              </li>
            );
          })}
        </ul>
        <div className="ag-list-footer">
          <span className="ag-progress-pill">{gradedCount}/{STUDENTS.length}</span>
          <span>{Math.round((gradedCount / STUDENTS.length) * 100)}% graded</span>
        </div>
      </div>

      {/* ── Panel 2: Student Code ────────────────────── */}
      <div className="ag-panel ag-code-panel">
        <div className="ag-panel-header">Panel 2: Student Code</div>
        <div className="ag-code-actions">
          <label className="ag-upload-btn">
            {fileLoading ? 'Loading…' : 'Upload File'}
            <input type="file" accept="*/*" onChange={handleFile} style={{ display: 'none' }} />
          </label>
        </div>
        <textarea className="ag-code-editor" value={code} onChange={e => setCode(e.target.value)} spellCheck={false} />
      </div>

      {/* ── Panel 3: Reference ───────────────────────── */}
      <div className="ag-panel ag-ref-panel">
        <div className="ag-panel-header">Panel 3: Reference</div>
        <pre className="ag-reference">{reference}</pre>
      </div>

      {/* ── Panel 4: Input ───────────────────────────── */}
      <div className="ag-panel ag-input-panel">
        <div className="ag-panel-header">Panel 4: Input</div>
        <p className="ag-input-hint">Test case inputs (stdin)</p>
        <textarea className="ag-input-box" value={input} onChange={e => setInput(e.target.value)} />
        <button className="ag-btn ag-btn-check" onClick={handleCheck} disabled={isChecking}>
          {isChecking ? 'Running…' : 'Run Code'}
        </button>
      </div>

      {/* ── Panel 5: Output ──────────────────────────── */}
      <div className="ag-panel ag-output-panel">
        <div className="ag-panel-header">Panel 5: Output</div>
        <div className={`ag-output-box ag-expected ${matched === true ? 'ag-match' : ''}`}>
          <span className="ag-output-label">Expected:</span>
          <textarea className="ag-output-inline-input" value={expected} onChange={e => setExpected(e.target.value)} />
        </div>
        <div className={`ag-output-box ag-actual ${actual && !matched ? 'ag-mismatch' : ''} ${matched ? 'ag-match' : ''}`}>
          <span className="ag-output-label">Actual:</span>
          <span className="ag-output-value">{actual || '—'}</span>
        </div>
        {actual && mismatchLine && !matched && <div className="ag-mismatch-msg">MISMATCH on line {mismatchLine}</div>}
        {matched && <div className="ag-match-msg">✓ OUTPUT MATCHES</div>}
      </div>

      {/* ── Panel 6: Feedback ────────────────────────── */}
      <div className="ag-panel ag-feedback-panel">
        <div className="ag-panel-header">Panel 6: Feedback</div>

        {/* Score — both sides editable, left auto-calculates from deductions */}
        <div className="ag-score-box">
          <span className="ag-score-word">Score:</span>
          <input
            className="ag-score-num-input"
            type="number"
            value={score}
            onChange={e => setScore(Number(e.target.value))}
            title="Edit score (auto-calculated from deductions)"
          />
          <span className="ag-score-slash"> / </span>
          <input
            className="ag-score-max-input"
            type="number"
            value={maxScore}
            onChange={e => setMaxScore(Number(e.target.value))}
            title="Edit max score"
          />
        </div>

        {/* Deductions — fully editable */}
        <div className="ag-deductions">
          <div className="ag-deductions-header">
            <span className="ag-deductions-label">Deductions:</span>
            <button className="ag-add-deduction-btn" onClick={addDeduction} title="Add deduction">
              <IconPlus /> Add
            </button>
          </div>
          <div className="ag-deduction-list">
            {deductions.map(d => (
              <div key={d.id} className="ag-deduction-row">
                <input
                  className="ag-deduction-pts"
                  type="number"
                  value={d.pts}
                  onChange={e => updateDeduction(d.id, 'pts', e.target.value)}
                  title="Points (negative)"
                />
                <input
                  className="ag-deduction-reason"
                  type="text"
                  value={d.reason}
                  onChange={e => updateDeduction(d.id, 'reason', e.target.value)}
                  placeholder="Reason…"
                />
                <button className="ag-deduction-del" onClick={() => removeDeduction(d.id)} title="Remove">
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Message to student */}
        <div className="ag-message-section">
          <label className="ag-message-label">Message to Student:</label>
          <textarea className="ag-message-box" value={message} onChange={e => setMessage(e.target.value)} />
        </div>

        <div className="ag-feedback-actions">
          <button className="ag-btn ag-btn-save" onClick={handleSaveNext}>Save &amp; Next</button>
          <button className="ag-btn ag-btn-skip">Skip</button>
        </div>

        <div className="ag-autosave">● Auto-saved {autoSaved}</div>
      </div>
    </div>
  );
}