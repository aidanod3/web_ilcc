/*
 * Header.jsx — Top toolbar with run/debug/step controls.
 *
 * Props:
 *   isRunning      — true while a /api/run request is in flight.
 *   isDebugging    — true when an active debug session exists.
 *   onRun          — callback: assemble + execute to completion.
 *   onDebug        — callback: start (or restart) a debug session.
 *   onStep(n)      — callback: step forward n instructions.
 *   onStop         — callback: end the current run or debug session.
 *   canStepForward — whether stepping forward is possible (program hasn't halted).
 *   onMenuOpen     — callback: open the problems drawer.
 */

import { useState, useRef, useEffect } from 'react';
import styles from './Header.module.css';
import { Play, Loader, BugPlay, RotateCcw, Square, StepForward, Menu, Settings, FileCode2, ChevronDown } from 'lucide-react';
import logo from '../../assets/ilcc_wht.PNG';

export default function Header({
  isRunning,
  isDebugging,
  onRun,
  onDebug,
  onStep,
  onStop,
  canStepForward,
  onMenuOpen,
  onImportTemplate,
}) {
  const [stepCountStr, setStepCountStr] = useState('1');

  /* Settings dropdown */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  /* Code Templates dropdown */
  const [templatesOpen,   setTemplatesOpen]   = useState(false);
  const [templates,       setTemplates]       = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const templatesRef     = useRef(null);
  const templatesFetched = useRef(false);

  const parseStepCount = (str) => {
    const v = parseInt(str, 10);
    return (isNaN(v) || v < 1) ? 1 : v;
  };

  /* Close settings when clicking outside */
  useEffect(() => {
    if (!settingsOpen) return;
    const handle = (e) => {
      if (!settingsRef.current?.contains(e.target)) setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [settingsOpen]);

  /* Close templates when clicking outside */
  useEffect(() => {
    if (!templatesOpen) return;
    const handle = (e) => {
      if (!templatesRef.current?.contains(e.target)) setTemplatesOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [templatesOpen]);

  /* Fetch demo list the first time the dropdown opens */
  useEffect(() => {
    if (!templatesOpen || templatesFetched.current) return;
    templatesFetched.current = true;
    setTemplatesLoading(true);
    fetch('/api/demos')
      .then(r => r.json())
      .then(data => { setTemplates(data); setTemplatesLoading(false); })
      .catch(()  => setTemplatesLoading(false));
  }, [templatesOpen]);

  return (
    <header className={styles.header}>

      {/* Left: logo + code templates dropdown */}
      <div className={styles.headerLeft}>
        <img src={logo} alt="ilcc" className={styles.logo} />

        <div className={styles.templatesWrapper} ref={templatesRef}>
          <button
            className={styles.menuBtn}
            onClick={() => setTemplatesOpen(o => !o)}
          >
            <FileCode2 size={17} />
            Code Templates
            <ChevronDown size={13} style={{ marginLeft: -2 }} />
          </button>

          {templatesOpen && (
            <div className={styles.templateDropdown}>
              {templatesLoading ? (
                <div className={styles.templateEmpty}>Loading…</div>
              ) : templates.map(t => (
                <button
                  key={t.name}
                  className={styles.templateItem}
                  onClick={() => {
                    onImportTemplate(t.name, t.content);
                    setTemplatesOpen(false);
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Centre: run/debug/step controls */}
      <div className={styles.actions}>

        <div className={styles.btnGroup}>
          <button
            className={`${isDebugging ? styles.btnGreen : styles.btn} ${styles.btnGroupLeft}`}
            type="button"
            onClick={isDebugging ? onDebug : onRun}
            disabled={isRunning && !isDebugging}
          >
            {isRunning && !isDebugging
              ? <Loader size={16} />
              : isDebugging
                ? <RotateCcw size={16} />
                : <Play size={16} fill="currentColor" />}
          </button>

          <button
            className={`${styles.btn} ${styles.btnGroupMid}`}
            type="button"
            onClick={!isDebugging && !isRunning ? onDebug : undefined}
            disabled={isRunning || isDebugging}
          >
            <BugPlay size={16} />
          </button>

          <button
            className={`${isRunning || isDebugging ? styles.btnRed : styles.btn} ${styles.btnGroupRight}`}
            type="button"
            onClick={onStop}
            disabled={!isRunning && !isDebugging}
          >
            <Square size={16} />
          </button>
        </div>

        {isDebugging && (
          <>
            <input
              className={styles.stepInput}
              type="number"
              min="1"
              value={stepCountStr}
              onChange={e => setStepCountStr(e.target.value)}
              onBlur={() => setStepCountStr(String(parseStepCount(stepCountStr)))}
              disabled={!canStepForward}
              aria-label="Steps per click"
            />
            <button
              className={styles.btn}
              type="button"
              onClick={() => onStep(parseStepCount(stepCountStr))}
              disabled={!canStepForward}
            >
              <StepForward size={16} />
            </button>
          </>
        )}

      </div>

      {/* Right: settings cog + dropdown (flex:1 keeps centre centred) */}
      <div className={styles.headerRight}>
        <div className={styles.settingsWrapper} ref={settingsRef}>
          <button
            className={styles.cogBtn}
            onClick={() => setSettingsOpen(o => !o)}
            title="Settings"
          >
            <Settings size={18} />
          </button>

          {settingsOpen && (
            <div className={styles.dropdown}>
              {/* Settings items will go here */}
            </div>
          )}
        </div>
      </div>

    </header>
  );
}
