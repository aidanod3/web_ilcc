/*
 * Header.jsx — Top toolbar with run/debug/step controls.
 *
 * This is a mostly-presentational component. It owns one piece of local
 * state: the step-count input, which controls how many instructions are
 * executed per click of the Step Forward button.
 *
 * Button visibility is conditional on the current mode:
 *   - Idle:      Run button + Debug button visible.
 *   - Running:   Run button shows a spinner, Debug is disabled.
 *   - Debugging: Run button hidden, Debug becomes a restart button,
 *                a step-count input + StepForward appear, Stop button appears.
 *
 * Props:
 *   isRunning      — true while a /api/run request is in flight.
 *   isDebugging    — true when an active debug session exists.
 *   onRun          — callback: assemble + execute to completion.
 *   onDebug        — callback: start (or restart) a debug session.
 *   onStep(n)      — callback: step forward n instructions.
 *   onStop         — callback: end the current run or debug session.
 *   canStepForward — whether stepping forward is possible (program hasn't halted).
 *   iteration      — current step number displayed during debugging.
 */

import { useState } from 'react';
import styles from './Header.module.css';
import { Play, Loader, BugPlay, RotateCcw, Square, StepForward } from 'lucide-react';
import logo from '../../assets/ilcc_wht.PNG';

export default function Header({
  isRunning,
  isDebugging,
  onRun,
  onDebug,
  onStep,
  onStop,
  canStepForward,
  iteration,
}) {
  /* Step count — how many instructions to execute per click.
     Stored as a string so the field can be freely edited (e.g. cleared
     before typing a new number) without the value snapping back to 1. */
  const [stepCountStr, setStepCountStr] = useState('1');

  /* Parse and clamp — used at click time and on blur. */
  const parseStepCount = (str) => {
    const v = parseInt(str, 10);
    return (isNaN(v) || v < 1) ? 1 : v;
  };

  return (
    <header className={styles.header}>

      {/* Left: logo */}
      <div>
        <img src={logo} alt="ilcc" className={styles.logo} />
      </div>

      {/* Center: action buttons */}
      <div className={styles.actions}>

        {/* ── Button group: Run/Restart · Debug · Stop ──
            Always visible; colours and icons change with mode.
              Idle:      Play   | BugPlay       | Stop (muted)
              Running:   Loader | BugPlay (off) | Stop (red)
              Debugging: Restart(green) | BugPlay (off) | Stop (red) */}
        <div className={styles.btnGroup}>

          {/* Left — Play (idle) · Spinner (running) · Restart (debugging) */}
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

          {/* Middle — BugPlay: starts debug when idle, disabled when active */}
          <button
            className={`${styles.btn} ${styles.btnGroupMid}`}
            type="button"
            onClick={!isDebugging && !isRunning ? onDebug : undefined}
            disabled={isRunning || isDebugging}
          >
            <BugPlay size={16} />
          </button>

          {/* Right — Stop: red when active, muted when idle */}
          <button
            className={`${isRunning || isDebugging ? styles.btnRed : styles.btn} ${styles.btnGroupRight}`}
            type="button"
            onClick={onStop}
            disabled={!isRunning && !isDebugging}
          >
            <Square size={16} />
          </button>

        </div>

        {/* Step controls: count input + forward button, debug mode only */}
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

      {/* Right: step counter during debugging */}
      <div className={styles.right}>
        {isDebugging && (
          <div className={styles.meta}>Step: {iteration || 0}</div>
        )}
      </div>

    </header>
  );
}
