/*
 * index.jsx — ILCC page root component.
 *
 * This is the top-level component for the /ilcc route. It owns all
 * application state and orchestrates the two main workflows:
 *
 *   1. Run  — assemble + execute the code to completion (useRunProgram).
 *   2. Debug — step through execution interactively (useDebugSession).
 *
 * State flows downward via props:
 *   - Header receives control callbacks (onRun, onDebug, onStep, etc.)
 *     and status flags (isRunning, isDebugging, canStepBack, etc.).
 *   - Main receives nothing yet — panels will be wired up once we
 *     connect the editor's source code and the debug state diffs.
 *
 * The root div uses flex column + height 100% so the Header takes its
 * natural height and Main fills the remaining viewport space.
 */

import { useRef } from 'react';
import Header from './Header';
import Workspace from './Workspace';
import useRunProgram from '../../hooks/useRunProgram';
import useDebugSession from '../../hooks/useDebugSession';

export default function Ilcc() {
  /* Ref to the CodeMirror editor — call editorRef.current.getCode()
     to read the document contents on demand (run/debug). */
  const editorRef = useRef(null);

  /* Hook for the "Run" workflow: assemble + execute to completion */
  const runner = useRunProgram();

  /* Hook for the "Debug" workflow: interactive stepping with diffs */
  const debug_session = useDebugSession();

  /* Helper to read the editor contents at the moment of action */
  const getCode = () => editorRef.current?.getCode() ?? '';

  /* ── Handler: Run button ──
     Reads the editor and sends to POST /api/run. */
  const handleRun = () => runner.run(getCode());

  /* ── Handler: Debug button ──
     Reads the editor and starts an interactive debug session. */
  const handleDebug = async () => {
    try {
      await debug_session.start(getCode());
    } catch (err) {
      // TODO: surface error to user (e.g. assembly errors)
    }
  };

  /* ── Handler: Stop button ──
     Ends whichever mode is active (run or debug). */
  const handleStop = () => {
    runner.reset();
    debug_session.stop();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Top toolbar: run/debug/step/stop buttons */}
      <Header
        isRunning={runner.isRunning}
        isDebugging={debug_session.isDebugging}
        onRun={handleRun}
        onDebug={handleDebug}
        onStep={() => debug_session.step(1)}
        onStop={handleStop}
        canStepForward={debug_session.isDebugging && !debug_session.programDone}
        iteration={debug_session.iteration}
      />

      {/* Workspace: editor, terminal, and debugger panels */}
      <Workspace
        editorRef={editorRef}
        output={debug_session.isDebugging ? debug_session.output : runner.output}
        debugState={debug_session.state}
        isDebugging={debug_session.isDebugging}
      />

    </div>
  );
}
