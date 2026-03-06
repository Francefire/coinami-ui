"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PlaybackControls from "./PlaybackControls";

export interface Step {
  id: string;
  title: string;
  description: string;
  content: ReactNode;
}

interface StepVisualizerProps {
  steps: Step[];
  stepDuration?: number;
  onStepChange?: (stepIndex: number) => void;
  className?: string;
}

export default function StepVisualizer({
  steps,
  stepDuration = 2500,
  onStepChange,
  className = "",
}: StepVisualizerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, steps.length - 1));
      setCurrentStep(clamped);
      onStepChange?.(clamped);
    },
    [steps.length, onStepChange]
  );

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => goTo(currentStep + 1), stepDuration);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps.length, stepDuration, goTo]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Step indicators */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            {/* Step dot + label */}
            <button
              onClick={() => {
                setIsPlaying(false);
                goTo(i);
              }}
              className="flex flex-col items-center gap-1 group"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-300 ${
                  i === currentStep
                    ? "border-primary bg-primary/20 text-primary scale-110"
                    : i < currentStep
                    ? "border-primary/50 bg-primary/10 text-primary/70"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-[10px] max-w-[5rem] text-center leading-tight transition-colors ${
                  i === currentStep
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {step.title}
              </span>
            </button>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="relative w-8 h-0.5 mx-1 mt-[-1rem]">
                <div className="absolute inset-0 bg-border rounded-full" />
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: i < currentStep ? "100%" : "0%",
                  }}
                  transition={{ duration: 0.4 }}
                />
                {/* Flowing dot */}
                {i === currentStep - 1 && (
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary"
                    initial={{ left: 0, opacity: 0 }}
                    animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Playback controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        currentStep={currentStep}
        totalSteps={steps.length}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onStepForward={() => goTo(currentStep + 1)}
        onStepBack={() => goTo(currentStep - 1)}
        onReset={() => {
          setIsPlaying(false);
          goTo(0);
        }}
      />

      {/* Step content */}
      <div className="relative min-h-[10rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={steps[currentStep].id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-2"
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              {steps[currentStep].description}
            </p>
            {steps[currentStep].content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
