import { useState } from 'react';

export function useTraceSession() {
  const [sessionId, setSessionId] = useState(null);
  const [traceSteps, setTraceSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isTracing, setIsTracing] = useState(false);
  const [traceOutput, setTraceOutput] = useState('');
  const [traceStatus, setTraceStatus] = useState({
    running: false,
    pauseReason: null,
    halted: false,
    waitingForInput: false
  });

  const stepCount = traceSteps.length;
  const activeStep = traceSteps[currentStep] || null;

  async function handleTrace(source, onSuccess, onError) {
    if (sessionId) {
      try {
        await fetch(`/api/trace/sessions/${sessionId}`, { method: 'DELETE' });
      } catch {
        // ignore cleanup failures
      }
    }

    setIsTracing(true);
    setCurrentStep(-1);
    setTraceSteps([]);
    setTraceStatus({
      running: false,
      pauseReason: null,
      halted: false,
      waitingForInput: false
    });
    setTraceOutput('');

    try {
      const response = await fetch('/api/trace/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trace program');
      }

      setSessionId(data.sessionId);
      setTraceSteps(data.snapshot ? [data.snapshot] : []);
      setCurrentStep(data.snapshot ? 0 : -1);
      setTraceStatus(
        data.status || {
          running: false,
          pauseReason: null,
          halted: false,
          waitingForInput: false
        }
      );
      setTraceOutput(data.output || '');
      if (onSuccess) onSuccess();
    } catch (error) {
      setSessionId(null);
      setTraceSteps([]);
      setCurrentStep(-1);
      setIsTracing(false);
      setTraceOutput('');
      if (onError) onError(String(error));
    }
  }

  function handlePrev() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  async function handleNext(onError) {
    if (!sessionId) return;

    if (currentStep < stepCount - 1) {
      setCurrentStep((prev) => Math.min(prev + 1, stepCount - 1));
      return;
    }

    if (traceStatus.halted) return;

    try {
      const response = await fetch(`/api/trace/sessions/${sessionId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1 })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to step trace');
      }

      setTraceStatus(data.status || traceStatus);
      setTraceOutput(data.output || '');
      if (data.snapshot) {
        setTraceSteps((prev) => {
          const updated = [...prev, data.snapshot];
          setCurrentStep(updated.length - 1);
          return updated;
        });
      }
    } catch (error) {
      if (onError) onError(String(error));
    }
  }

  async function handleReset() {
    if (sessionId) {
      try {
        await fetch(`/api/trace/sessions/${sessionId}`, { method: 'DELETE' });
      } catch {
        // ignore cleanup failures
      }
    }
    setSessionId(null);
    setTraceSteps([]);
    setCurrentStep(-1);
    setIsTracing(false);
    setTraceOutput('');
    setTraceStatus({
      running: false,
      pauseReason: null,
      halted: false,
      waitingForInput: false
    });
  }

  function clearTraceOutput() {
    setTraceOutput('');
  }

  return {
    sessionId,
    traceSteps,
    currentStep,
    setCurrentStep,
    isTracing,
    traceOutput,
    traceStatus,
    stepCount,
    activeStep,
    handleTrace,
    handlePrev,
    handleNext,
    handleReset,
    clearTraceOutput,
    canStepBack: stepCount > 0 && currentStep > 0,
    canStepForward: stepCount > 0 && (currentStep < stepCount - 1 || !traceStatus.halted)
  };
}
