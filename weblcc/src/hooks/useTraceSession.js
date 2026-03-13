import { useState } from 'react';

export function useTraceSession() {
  const [traceSteps, setTraceSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTracing, setIsTracing] = useState(false);

  const stepCount = traceSteps.length;
  const activeStep = traceSteps[currentStep] || null;

  async function handleTrace(source, onSuccess, onError) {
    setIsTracing(true);
    setCurrentStep(0);

    try {
      const response = await fetch('/api/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trace program');
      }

      setTraceSteps(data.steps || []);
      if (onSuccess) onSuccess();
    } catch (error) {
      setTraceSteps([]);
      setIsTracing(false);
      if (onError) onError(String(error));
    }
  }

  function handlePrev() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  function handleNext() {
    setCurrentStep((prev) => Math.min(prev + 1, stepCount - 1));
  }

  function handleReset() {
    setTraceSteps([]);
    setCurrentStep(0);
    setIsTracing(false);
  }

  return {
    traceSteps,
    currentStep,
    setCurrentStep,
    isTracing,
    stepCount,
    activeStep,
    handleTrace,
    handlePrev,
    handleNext,
    handleReset,
    canStepBack: stepCount > 0 && currentStep > 0,
    canStepForward: stepCount > 0 && currentStep < stepCount - 1
  };
}