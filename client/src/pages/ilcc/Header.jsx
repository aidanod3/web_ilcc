/* Header.jsx — Top toolbar with run/debug/step controls.
 * All state is owned by the parent (index.jsx) and passed as props.
 * Buttons conditionally render based on isRunning / isDebugging state.
 */

import styles from './Header.module.css';
import { Play, Loader, BugPlay, RotateCcw, Square, StepBack, StepForward } from 'lucide-react';

export default function Header({
  isRunning,
  isDebugging,
  onRun,
  onDebug,
  onStep,
  onStepBack,
  onStop,
  canStepBack,
  canStepForward,
  iteration,
}) {
  return (
    <header className={styles.header}>
      <div>
        <h1>&lt;lcc&gt;</h1>
      </div>

      <div className={styles.actions}>
        {/* Run: assembles + executes to completion */}
        {!isDebugging && (
          <button className={styles.btn} type="button" onClick={onRun} disabled={isRunning}>
            {isRunning ? <Loader size={16} /> : <Play size={16} fill="currentColor" />}
          </button>
        )}

        {/* Debug: starts or restarts a debug session */}
        <button
          className={isDebugging ? styles.btnGreen : styles.btn}
          type="button"
          onClick={onDebug}
          disabled={isRunning}
        >
          {isDebugging ? <RotateCcw size={16} /> : <BugPlay size={16} />}
        </button>

        {/* Step back / forward (only visible while debugging) */}
        {isDebugging && (
          <>
            <button className={styles.btn} type="button" onClick={onStepBack} disabled={!canStepBack}>
              <StepBack size={16} />
            </button>
            <button className={styles.btn} type="button" onClick={onStep} disabled={!canStepForward}>
              <StepForward size={16} />
            </button>
          </>
        )}

        {/* Stop: ends run or debug session */}
        {(isRunning || isDebugging) && (
          <button className={styles.btnRed} type="button" onClick={onStop}>
            <Square size={16} />
          </button>
        )}
      </div>

      <div className={styles.right}>
        {isDebugging && (
          <div className={styles.meta}>Step: {iteration || 0}</div>
        )}
      </div>
    </header>
  );
}
