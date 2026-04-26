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
import { Play, Loader, BugPlay, RotateCcw, Square, StepForward, Menu, Settings } from 'lucide-react';
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
}) {
  const [stepCountStr, setStepCountStr] = useState('1');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  const parseStepCount = (str) => {
    const v = parseInt(str, 10);
    return (isNaN(v) || v < 1) ? 1 : v;
  };

  /* Close the settings dropdown when clicking outside it */
  useEffect(() => {
    if (!settingsOpen) return;
    const handleClick = (e) => {
      if (!settingsRef.current?.contains(e.target)) setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [settingsOpen]);

  return (
    <header className={styles.header}>

      {/* Left: logo + problem list button (flex:1 so centre stays centred) */}
      <div className={styles.headerLeft}>
        <img src={logo} alt="ilcc" className={styles.logo} />
        <button className={styles.menuBtn} onClick={onMenuOpen}>
          <Menu size={25} />
          Problem List
        </button>
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
