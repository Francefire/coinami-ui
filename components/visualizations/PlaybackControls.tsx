"use client";

import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
} from "lucide-react";

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
}

export default function PlaybackControls({
  isPlaying,
  currentStep,
  totalSteps,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onReset,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onReset}
        disabled={currentStep === 0 && !isPlaying}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onStepBack}
        disabled={currentStep === 0 || isPlaying}
      >
        <SkipBack className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full border border-primary/40 text-primary hover:bg-primary/10"
        onClick={isPlaying ? onPause : onPlay}
        disabled={currentStep >= totalSteps - 1 && !isPlaying}
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5 ml-0.5" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onStepForward}
        disabled={currentStep >= totalSteps - 1 || isPlaying}
      >
        <SkipForward className="h-3.5 w-3.5" />
      </Button>

      <span className="text-xs text-muted-foreground ml-1 tabular-nums">
        {currentStep + 1} / {totalSteps}
      </span>
    </div>
  );
}
