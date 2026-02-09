import React, { useState } from "react";
import "./Autograder.css";

export default function Autograder() {
  const [code, setCode] = useState("// Paste or upload code here...");
  const [output, setOutput] = useState("Your output will appear here.");
  const [expected, setExpected] = useState("Expected output will appear here.");
  const [status, setStatus] = useState("All Good / Errors Detected");

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

  return (
    <div className="autograder-root">
      <div className="autograder-inner">
        <div className="left-panel">
          <textarea
            className="code-preview"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label="Code preview"
          />
        </div>

        <div className="center-panel">
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

        <div className="right-panel">
          <div className="status-pill">{status}</div>
          <div className="output-box">
            <pre>{output}</pre>
          </div>
          <div className="expected-box">
            <pre>{expected}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
  