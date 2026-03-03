import { useMemo, useState } from 'react';

// import { DEFAULT_FLAGS, DEFAULT_REGISTERS, DEFAULT_STACK } from '../constants/cpuDefaults.js';
import { useRunProgram } from '../hooks/useRunProgram.js';
// import { useTraceSession } from '../hooks/useTraceSession.js';

import Header from '../components/shared/Header.jsx';
import Dashboard from '../components/ilcc/Dashboard.jsx';

// import CodeEditor from '../components/ilcc/CodeEditor.jsx';
// import OutputPanel from '../components/ilcc/OutputPanel.jsx';
// import FlagsPanel from '../components/RightPanel/Flags/FlagsPanel.jsx';
// import MemoryPanel from '../components/RightPanel/Memory/MemoryPanel.jsx';
// import RegistersPanel from '../components/RightPanel/Registers/RegistersPanel.jsx';
// import StackPanel from '../components/RightPanel/Stack/StackPanel.jsx';

import styles from './ilcc.module.css';

const starterProgram = `; ex0301.a
          ld r0, x
          ld r1, y
          add r0, r0, r1
          dout r0
          nl
          halt
x:        .word 2
y:        .word 3
`;

function normalizeLines(source) {
  return source.replace(/\r\n/g, '\n').split('\n');
}

export default function Ilcc() {
  const [source, setSource] = useState(starterProgram); //source by default is starterProgram
  const [leftTab, setLeftTab] = useState('output');

  const { isRunning, output, setOutput, handleRun } = useRunProgram();

  // const {
  //   traceSteps,
  //   currentStep,
  //   setCurrentStep,
  //   isTracing,
  //   stepCount,
  //   activeStep,
  //   handleTrace,
  //   handlePrev,
  //   handleNext,
  //   handleReset,
  //   canStepBack,
  //   canStepForward
  // } = useTraceSession();

  // const lines = useMemo(() => normalizeLines(source), [source]);
  // const activeLine = activeStep ? activeStep.lineNumber - 1 : -1;

  // const registers = activeStep?.registers || DEFAULT_REGISTERS;
  // const flags = activeStep?.flags || DEFAULT_FLAGS;
  // const stack = activeStep?.stack || DEFAULT_STACK;
  // const eventLabel = activeStep?.action || 'No trace data loaded.';

  // function handleDownload() {
  //   const blob = new Blob([source], { type: 'text/plain' });
  //   const url = URL.createObjectURL(blob);
  //   const link = document.createElement('a');
  //   link.href = url;
  //   link.download = 'program.a';
  //   document.body.appendChild(link);
  //   link.click();
  //   link.remove();
  //   URL.revokeObjectURL(url);
  // }

  return (
    <div className={styles.appShell}>
      <div className={styles.header}>
        <Header 
          isRunning={isRunning}
          onRun = {() => handleRun(source)}
        />
      </div>
      <div className={styles.dashboard}>
        <Dashboard 
          output={output}
        />
      </div>
    </div>
    // <div className={styles.appShell}>
    //   <Header
    //     isRunning={isRunning}
    //     stepCount={stepCount}
    //     onRun={() => handleRun(source)}
    //     onTrace={() => handleTrace(source, () => setLeftTab('trace'), setOutput)}
    //     onPrev={handlePrev}
    //     onNext={handleNext}
    //     onReset={handleReset}
    //     onDownload={handleDownload}
    //     canStepBack={canStepBack}
    //     canStepForward={canStepForward}
    //   />

    //   <div className={styles.layout}>
    //     <div className={styles.left}>
    //       <CodeEditor
    //         isTracing={isTracing}
    //         lines={lines}
    //         activeLine={activeLine}
    //         source={source}
    //         onSourceChange={setSource}
    //       />
    //       <OutputPanel
    //         activeTab={leftTab}
    //         onTabChange={setLeftTab}
    //         output={output}
    //         traceSteps={traceSteps}
    //         currentStep={currentStep}
    //         onSelectStep={setCurrentStep}
    //       />
    //     </div>

    //     <div className={styles.panelRight}>
    //       <RegistersPanel registers={registers} />
    //       <FlagsPanel flags={flags} />
    //       <StackPanel stack={stack} eventLabel={eventLabel} />
    //       <MemoryPanel stack={stack} />
    //     </div>
    //   </div>
    // </div>
  );
}