import styles from './Header.module.css';
import { Play, Loader, BugPlay, RotateCcw, Square, StepBack, StepForward} from 'lucide-react';

export default function Header({
  isRunning,
  isTracing,
  stepCount,
  onRun,
  onTrace,
  onPrev,
  onNext,
  onReset,
  canStepBack,
  canStepForward,
  samplePrograms,
  selectedSample,
  onSampleChange
}) {

  const idle = !isRunning && !isTracing;

  return (
    <header className={styles.header}>
      <div>
        <h1>&lt;lcc&gt;</h1>
      </div>
      <div className={styles.actions}>
        <select
          className={styles.sampleSelect}
          value={selectedSample}
          onChange={(event) => onSampleChange(event.target.value)}
          aria-label="Load sample program"
        >
          {samplePrograms.map((program) => (
            <option key={program.id} value={program.id}>
              {program.label}
            </option>
          ))}
        </select>


        {/* run button */}
        {!isTracing && (
          <button className={styles.btn} type="button" onClick={onRun} disabled={isRunning}>
            {isRunning ? <Loader size={16} /> : <Play size={16} fill="currentColor" />}
          </button>
        )}

        {/* step buttons */}
        {isTracing && (
          <>
            <button className={styles.btn} type="button" onClick={onPrev} disabled={!canStepBack}>
              <StepBack size={16} />
            </button>
            <button className={styles.btn} type="button" onClick={onNext} disabled={!canStepForward}>
              <StepForward size={16} />
            </button>
          </>
        )}

        {/* debug button */}
        <button className={isTracing ? styles.btnGreen : styles.btn} type="button" onClick={onTrace} disabled={isRunning}>
          {isTracing ? <RotateCcw size={16} /> : <BugPlay size={16} />}
        </button>

        {/* stop buttons */}
        {(isRunning || isTracing) && (
          <button className={styles.btnRed} type="button" onClick={onReset}>
            <Square size={16} />
          </button>
        )}

      </div>
      <div className={styles.meta}>Trace Steps: {stepCount || 0}</div>
    </header>
  );
}
