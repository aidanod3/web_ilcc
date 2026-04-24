/*
 * Header.jsx — Top toolbar with run/debug/step controls.
 *
 * This is a pure presentational component — all state is owned by the
 * parent (index.jsx) and passed down as props. The Header never makes
 * API calls or manages state itself.
 *
 * Button visibility is conditional on the current mode:
 *   - Idle:      Run button + Debug button visible.
 *   - Running:   Run button shows a spinner, Debug is disabled.
 *   - Debugging: Run button hidden, Debug becomes a restart button,
 *                StepBack/StepForward appear, Stop button appears.
 *
 * Props:
 *   isRunning      — true while a /api/run request is in flight.
 *   isDebugging    — true when an active debug session exists.
 *   onRun          — callback: assemble + execute to completion.
 *   onDebug        — callback: start (or restart) a debug session.
 *   onStep         — callback: step forward one instruction.
 *   onStop         — callback: end the current run or debug session.
 *   canStepForward — whether stepping forward is possible (program hasn't halted).
 *   iteration      — current step number displayed during debugging.
 */

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

        {/* Step forward: only visible while a debug session is active. */}
        {isDebugging && (
          <button className={styles.btn} type="button" onClick={onStep} disabled={!canStepForward}>
            <StepForward size={16} />
          </button>
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
