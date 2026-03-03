import { useState } from 'react';

import { DEFAULT_FLAGS, DEFAULT_REGISTERS, DEFAULT_STACK } from '../constants/cpuDefaults.js';
import { useRunProgram } from '../hooks/useRunProgram.js';
import { useTraceSession } from '../hooks/useTraceSession.js';

import Header from '../components/shared/Header.jsx';
import Dashboard from '../components/ilcc/Dashboard.jsx';

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

const samplePrograms = [
  { id: 'starter', label: 'Starter: Add Two Numbers', source: starterProgram },
  {
    id: 'countdown',
    label: 'Countdown Loop',
    source: `; Countdown from 5 to 1
        mov r0, 5
loop:   dout r0
        nl
        sub r0, r0, 1
        brp loop
        halt
`
  },
  {
    id: 'sum10',
    label: 'Sum 1..10',
    source: `; Sum numbers from 1 to 10
        mov r0, 10     ; counter
        mov r1, 0      ; sum
loop:   add r1, r1, r0
        sub r0, r0, 1
        brp loop
        dout r1
        nl
        halt
`
  }
];

export default function Ilcc() {
  const [source, setSource] = useState(starterProgram);
  const [selectedSample, setSelectedSample] = useState('starter');
  const studentMode = false;

  const { isRunning, output, setOutput, handleRun, clearOutput } = useRunProgram();
  const {
    isTracing,
    traceOutput,
    traceSteps,
    currentStep,
    activeStep,
    stepCount,
    handleTrace,
    handlePrev,
    handleNext,
    handleReset,
    clearTraceOutput,
    canStepBack,
    canStepForward
  } = useTraceSession();

  const registers = activeStep?.registers || DEFAULT_REGISTERS;
  const flags = activeStep?.flags || DEFAULT_FLAGS;
  const special = activeStep?.special || [];
  const stack = activeStep?.stack || DEFAULT_STACK;
  const memoryRows = activeStep?.memory || [];
  const previousStep = currentStep > 0 ? traceSteps[currentStep - 1] : null;
  const eventLabel = activeStep?.action || 'No trace data loaded.';
  const traceInfo = activeStep
    ? `Line ${activeStep.lineNumber || 0} • ${activeStep.mnemonic || ''} • PC ${activeStep.pc || '0x0000'}`
    : 'Trace not started.';

  function handleSampleChange(sampleId) {
    const next = samplePrograms.find((program) => program.id === sampleId);
    if (!next) return;
    setSelectedSample(sampleId);
    setSource(next.source);
    setOutput(`Loaded sample: ${next.label}`);
  }

  async function onTrace() {
    setOutput('');
    await handleTrace(source, null, setOutput);
  }

  async function onStepForward() {
    await handleNext(setOutput);
  }

  async function onResetTrace() {
    await handleReset();
    setOutput('Trace reset.');
  }

  function onDownload() {
    const blob = new Blob([source], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'program.a';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function onClearTerminal() {
    clearOutput();
    clearTraceOutput();
  }

  return (
    <div className={styles.appShell}>
      <div className={styles.header}>
        <Header
          isRunning={isRunning}
          isTracing={isTracing}
          stepCount={stepCount}
          onRun={() => handleRun(source)}
          onTrace={onTrace}
          onPrev={handlePrev}
          onNext={onStepForward}
          onReset={onResetTrace}
          canStepBack={canStepBack}
          canStepForward={canStepForward}
          samplePrograms={samplePrograms}
          selectedSample={selectedSample}
          onSampleChange={handleSampleChange}
        />
      </div>
      <div className={styles.dashboard}>
        <Dashboard
          output={isTracing ? traceOutput : output}
          source={source}
          setSource={setSource}
          onDownload={onDownload}
          onClearTerminal={onClearTerminal}
          studentMode={studentMode}
          registers={registers}
          previousRegisters={previousStep?.registers || []}
          flags={flags}
          previousFlags={previousStep?.flags || {}}
          special={special}
          stack={stack}
          previousStack={previousStep?.stack || []}
          memoryRows={memoryRows}
          previousMemoryRows={previousStep?.memory || []}
          eventLabel={eventLabel}
          traceInfo={traceInfo}
        />
      </div>
    </div>
  );
}
