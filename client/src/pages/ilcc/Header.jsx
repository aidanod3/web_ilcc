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

      {/* Left: app title */}
      <div>
        <h1>&lt;ilcc&gt;</h1>
      </div>

      {/* Center: action buttons */}
      <div className={styles.actions}>

        {/* Run: assembles + executes to completion.
            Hidden while debugging (debug has its own step controls). */}
        {!isDebugging && (
          <button className={styles.btn} type="button" onClick={onRun} disabled={isRunning}>
            {isRunning ? <Loader size={16} /> : <Play size={16} fill="currentColor" />}
          </button>
        )}

        {/* Debug: starts a new debug session, or restarts the current one.
            Shows a restart icon (RotateCcw) when already debugging. */}
        <button
          className={isDebugging ? styles.btnGreen : styles.btn}
          type="button"
          onClick={onDebug}
          disabled={isRunning}
        >
          {isDebugging ? <RotateCcw size={16} /> : <BugPlay size={16} />}
        </button>

        {/* Step controls: count input + forward button, debug mode only. */}
        {isDebugging && (
          <>
            {/* Number of instructions to execute per step */}
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

            {/* Execute stepCount instructions forward */}
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

        {/* Stop: ends the current run or debug session.
            Only visible when something is active. */}
        {(isRunning || isDebugging) && (
          <button className={styles.btnRed} type="button" onClick={onStop}>
            <Square size={16} />
          </button>
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
