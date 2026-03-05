import React, { useState } from "react";
import "./Autograder.css";

export default function Autograder() {
  const [code, setCode] = useState("// Paste or upload code here...");
  const [output, setOutput] = useState("Your output will appear here.");
  const [expected, setExpected] = useState("Expected output will appear here.");
  const [status, setStatus] = useState("All Good / Errors Detected");
  const [theme, setTheme] = useState("light");

  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCode(String(ev.target.result || ""));
    reader.readAsText(f);
  };

  const handleCheck = () => {
    setStatus("Checking...");
    setTimeout(() => {
      setStatus("All Good");
      setOutput("(simulated) Program ran successfully.\nOutput lines here...");
    }, 700);
  };

  const handleSubmit = () => {
    setStatus("Submitting...");
    setTimeout(() => setStatus("Submitted"), 900);
  };

  const handleSwitch = () => {
    window.location.href = "/main";
  };

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  return (
    <div className={`autograder-root ${theme}`}>
      <div className="autograder-inner">
        <div className="left-panel panel">
          <div className="panel-header">Panel 1: Students</div>
          <div className="students-list">
            <input className="search" placeholder="Search / Filter" />
            <ul>
              <li className="student graded">● Student Name <span>Graded</span></li>
              <li className="student inprog">● Student Name <span>InProg</span></li>
              <li className="student ungraded">○ Student Name <span>Ungraded</span></li>
              <li className="student late">● Student Name <span>Late</span></li>
            </ul>
            <div className="list-footer">2/8 • 25% graded</div>
          </div>
        </div>

        <div className="center-panel">
          <div className="panel panel-code">
            <div className="panel-header">Panel 2: Student Code</div>
            <textarea
              className="code-preview"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Code preview"
            />
          </div>

          <div className="panel panel-reference">
            <div className="panel-header">Panel 3: Reference</div>
            <pre className="reference">; reference solution or notes go here</pre>
          </div>

          <div className="panel panel-input">
            <div className="panel-header">Panel 4: Input</div>
            <div className="input-box">5 10 -3</div>
          </div>

          <div className="panel panel-output">
            <div className="panel-header">Panel 5: Output</div>
            <div className="expected-box"><pre>{expected}</pre></div>
            <div className="output-box"><pre>{output}</pre></div>
          </div>
        </div>

        <div className="right-panel panel">
          <div className="panel-header">Panel 6: Feedback</div>
          <div className="feedback-content">
            <div className="status-pill">{status}</div>

            <div className="controls">
              <button className="btn theme-toggle" type="button" onClick={toggleTheme}>
                {theme === "light" ? "Dark Mode" : "Light Mode"}
              </button>
              <label className="file-label" aria-hidden="false">
                <span>Upload File</span>
                <input type="file" accept="*/*" onChange={handleFile} />
              </label>
              <button className="btn" type="button" onClick={handleCheck}>
                Check Code
              </button>
              <button className="btn" type="button" onClick={handleSubmit}>
                Submit Code
              </button>
              <button className="btn switch" type="button" onClick={handleSwitch}>
                Switch to ILCC
              </button>
            </div>

            <div className="message-box">
              <strong>Message to Student:</strong>
              <div className="message">Good work! Check pcOffset in Q3 (+1 for PC advance).</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
