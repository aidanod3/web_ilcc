/* index.jsx — ILCC page root.
 * Owns all state (code, run, debug) and passes it to child components.
 * Header: toolbar with run/debug/step controls.
 * Main: two-column layout with editor, terminal, and debugger panels.
 */

import { useState } from 'react';
import Header from './Header';
import Main from './Main';
import useRunProgram from '../../hooks/useRunProgram';
import useDebugSession from '../../hooks/useDebugSession';

export default function Ilcc() {
  const [code, setCode] = useState('');

  const runner = useRunProgram();
  const debugger_ = useDebugSession();

  const handleRun = () => runner.run(code);

  const handleDebug = async () => {
    try {
      await debugger_.start(code);
    } catch (err) {
      // TODO: surface error to user
    }
  };

  const handleStop = () => {
    runner.reset();
    debugger_.stop();
  };

  return (
    <div>
      <Header
        isRunning={runner.isRunning}
        isDebugging={debugger_.isDebugging}
        onRun={handleRun}
        onDebug={handleDebug}
        onStep={() => debugger_.step(1)}
        onStepBack={() => debugger_.step(-1)}
        onStop={handleStop}
        canStepBack={debugger_.isDebugging && debugger_.iteration > 0}
        canStepForward={debugger_.isDebugging && debugger_.programRunning}
        iteration={debugger_.iteration}
      />
      <Main />
    </div>
  );
}
