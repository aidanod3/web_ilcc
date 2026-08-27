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
import { Play, Loader, BugPlay, RotateCcw, Square, StepForward, FastForward, Menu, Settings, FileCode2, ChevronDown } from 'lucide-react';
import logoWht from '../../assets/ilcc_wht.PNG';
import logoBlk from '../../assets/ilcc_blk.png';
import HelpMenu from '../../components/HelpMenu';
import UserMenu from '../../components/UserMenu';

const DEBUGGER_LAYOUTS = [
  { id: 'classic', label: 'Classic' },
  { id: 'compact', label: 'Compact' },
];

export default function Header({
  isRunning,
  isDebugging,
  onRun,
  onDebug,
  onStep,
  onStop,
  canStepForward,
  onContinue,
  lastStop,
  onMenuOpen,
  onImportTemplate,
  theme,
  setTheme,
  themes,
  debuggerLayout,
  setDebuggerLayout,
}) {
  const [stepCountStr, setStepCountStr] = useState('1');

  /* Settings dropdown */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themesOpen,   setThemesOpen]   = useState(false);
  const [layoutOpen,   setLayoutOpen]   = useState(false);
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

  /* Close settings (and reset sub-menus) when clicking outside */
  useEffect(() => {
    if (!settingsOpen) return;
    const handle = (e) => {
      if (!settingsRef.current?.contains(e.target)) {
        setSettingsOpen(false);
        setThemesOpen(false);
        setLayoutOpen(false);
      }
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
    fetch(`${import.meta.env.BASE_URL}api/demos`)
      .then(r => r.json())
      .then(data => { setTemplates(data); setTemplatesLoading(false); })
      .catch(()  => setTemplatesLoading(false));
  }, [templatesOpen]);

  return (
    <header className={styles.header}>

      {/* Left: problems menu + logo + code templates dropdown */}
      <div className={styles.headerLeft}>
        <button
          className={styles.cogBtn}
          type="button"
          onClick={onMenuOpen}
          title="Problems"
          aria-label="Open problems panel"
          data-tour="problems"
        >
          <Menu size={18} />
        </button>

        <img src={theme === 'light' ? logoBlk : logoWht} alt="ilcc" className={styles.logo} data-tour="brand" />

        <div className={styles.templatesWrapper} ref={templatesRef}>
          <button
            className={styles.menuBtn}
            onClick={() => setTemplatesOpen(o => !o)}
            data-tour="templates"
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
            data-tour="run"
            title={isDebugging ? 'Restart debug session' : 'Run (Ctrl/⌘+Enter)'}
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
            data-tour="debug"
            title="Debug (F5)"
          >
            <BugPlay size={16} />
          </button>

          <button
            className={`${isRunning || isDebugging ? styles.btnRed : styles.btn} ${styles.btnGroupRight}`}
            type="button"
            onClick={onStop}
            disabled={!isRunning && !isDebugging}
            data-tour="stop"
            title="Stop (Esc)"
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
              data-tour="step-count"
            />
            <button
              className={styles.btn}
              type="button"
              onClick={() => onStep(parseStepCount(stepCountStr))}
              disabled={!canStepForward}
              data-tour="step"
              title="Step (F10)"
            >
              <StepForward size={16} />
            </button>
            <button
              className={styles.btn}
              type="button"
              onClick={onContinue}
              disabled={!canStepForward}
              data-tour="continue"
              title="Continue to next breakpoint (F8)"
            >
              <FastForward size={16} />
            </button>
            {lastStop === 'breakpoint' && <span className={styles.stopNote}>● breakpoint</span>}
            {lastStop === 'budget' && <span className={styles.stopNote} title="Stopped after 100k instructions without hitting a breakpoint">paused</span>}
          </>
        )}

      </div>

      {/* Right: settings cog + dropdown (flex:1 keeps centre centred) */}
      <div className={styles.headerRight}>
        <HelpMenu />
        <UserMenu />
        <div className={styles.settingsWrapper} ref={settingsRef}>
          <button
            className={styles.cogBtn}
            onClick={() => setSettingsOpen(o => !o)}
            title="Settings"
            data-tour="settings"
          >
            <Settings size={18} />
          </button>

          {settingsOpen && (
            <div className={styles.dropdown}>

              {/* Theme sub-section */}
              <button
                className={styles.settingsRow}
                onClick={() => setThemesOpen(o => !o)}
              >
                <span>Theme</span>
                <ChevronDown
                  size={12}
                  style={{
                    transform: themesOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.15s',
                    flexShrink: 0,
                  }}
                />
              </button>

              {themesOpen && (themes || []).map(t => (
                <button
                  key={t.id}
                  className={`${styles.themeItem} ${t.id === theme ? styles.themeItemActive : ''}`}
                  onClick={() => { setTheme(t.id); setSettingsOpen(false); setThemesOpen(false); }}
                >
                  {t.label}
                </button>
              ))}

              <div className={styles.dropdownDivider} />

              {/* Debugger Layout sub-section */}
              <button
                className={styles.settingsRow}
                onClick={() => setLayoutOpen(o => !o)}
              >
                <span>Debugger Layout</span>
                <ChevronDown
                  size={12}
                  style={{
                    transform: layoutOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.15s',
                    flexShrink: 0,
                  }}
                />
              </button>

              {layoutOpen && DEBUGGER_LAYOUTS.map(l => (
                <button
                  key={l.id}
                  className={`${styles.themeItem} ${l.id === debuggerLayout ? styles.themeItemActive : ''}`}
                  onClick={() => { setDebuggerLayout(l.id); setSettingsOpen(false); setLayoutOpen(false); }}
                >
                  {l.label}
                </button>
              ))}

            </div>
          )}
        </div>
      </div>

    </header>
  );
}
