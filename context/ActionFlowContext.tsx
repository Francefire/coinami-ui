"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import type { Tab } from "@/components/layout/Dashboard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FlowStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "done" | "error";
  detail?: string;
}

export type FlowType =
  | "claim"
  | "transfer"
  | "mine"
  | "sync"
  | "create_escrow"
  | "release_escrow"
  | "cancel_escrow";

export interface NextAction {
  label: string;
  description?: string;
  tab?: Tab;
  /** If provided, executes this instead of switching tabs */
  action?: () => Promise<void> | void;
}

export interface ActionFlow {
  id: string;
  type: FlowType;
  title: string;
  steps: FlowStep[];
  currentStepIndex: number;
  status: "running" | "done" | "error";
  startedAt: number;
  nextActions: NextAction[];
  result?: { hash?: string; detail?: string };
}

interface ActionFlowContextValue {
  activeFlow: ActionFlow | null;
  flowHistory: ActionFlow[];
  startFlow: (opts: {
    type: FlowType;
    title: string;
    steps: Omit<FlowStep, "status">[];
    nextActions?: NextAction[];
  }) => string;
  advanceStep: (detail?: string) => void;
  failStep: (errorMsg: string) => void;
  completeFlow: (result?: ActionFlow["result"], nextActions?: NextAction[]) => void;
  dismissFlow: () => void;
  /** navigate to tab from overlay */
  navigateTab?: (tab: Tab) => void;
  setNavigateTab: (fn: (tab: Tab) => void) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ActionFlowContext = createContext<ActionFlowContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ActionFlowProvider({ children }: { children: React.ReactNode }) {
  const [activeFlow, setActiveFlow] = useState<ActionFlow | null>(null);
  const [flowHistory, setFlowHistory] = useState<ActionFlow[]>([]);
  const [navigateTab, setNavigateTabState] = useState<((tab: Tab) => void) | undefined>(undefined);

  const startFlow = useCallback(
    (opts: {
      type: FlowType;
      title: string;
      steps: Omit<FlowStep, "status">[];
      nextActions?: NextAction[];
    }): string => {
      const id = `flow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const steps: FlowStep[] = opts.steps.map((s, i) => ({
        ...s,
        status: i === 0 ? "active" : "pending",
      }));

      const flow: ActionFlow = {
        id,
        type: opts.type,
        title: opts.title,
        steps,
        currentStepIndex: 0,
        status: "running",
        startedAt: Date.now(),
        nextActions: opts.nextActions ?? [],
      };

      setActiveFlow(flow);
      return id;
    },
    [],
  );

  const advanceStep = useCallback(
    (detail?: string) => {
      setActiveFlow((prev) => {
        if (!prev || prev.status !== "running") return prev;

        const steps = [...prev.steps];
        const idx = prev.currentStepIndex;

        // Mark current step as done
        steps[idx] = { ...steps[idx], status: "done", detail: detail ?? steps[idx].detail };

        // Advance to next step
        const nextIdx = idx + 1;
        if (nextIdx < steps.length) {
          steps[nextIdx] = { ...steps[nextIdx], status: "active" };
          return { ...prev, steps, currentStepIndex: nextIdx };
        }

        // All steps done
        return { ...prev, steps, currentStepIndex: idx, status: "done" };
      });
    },
    [],
  );

  const failStep = useCallback(
    (errorMsg: string) => {
      setActiveFlow((prev) => {
        if (!prev || prev.status !== "running") return prev;

        const steps = [...prev.steps];
        steps[prev.currentStepIndex] = {
          ...steps[prev.currentStepIndex],
          status: "error",
          detail: errorMsg,
        };

        return { ...prev, steps, status: "error" };
      });
    },
    [],
  );

  const completeFlow = useCallback(
    (result?: ActionFlow["result"], nextActions?: NextAction[]) => {
      setActiveFlow((prev) => {
        if (!prev) return prev;

        // Mark any remaining active step as done
        const steps = prev.steps.map((s) =>
          s.status === "active" ? { ...s, status: "done" as const } : s,
        );

        const completed: ActionFlow = {
          ...prev,
          steps,
          status: "done",
          result: result ?? prev.result,
          nextActions: nextActions ?? prev.nextActions,
        };

        setFlowHistory((h) => [completed, ...h].slice(0, 20));
        return completed;
      });
    },
    [],
  );

  const dismissFlow = useCallback(() => {
    setActiveFlow((prev) => {
      if (prev && prev.status !== "running") {
        return null;
      }
      // Don't dismiss a running flow
      return prev;
    });
  }, []);

  const setNavigateTab = useCallback((fn: (tab: Tab) => void) => {
    setNavigateTabState(() => fn);
  }, []);

  return (
    <ActionFlowContext.Provider
      value={{
        activeFlow,
        flowHistory,
        startFlow,
        advanceStep,
        failStep,
        completeFlow,
        dismissFlow,
        navigateTab,
        setNavigateTab,
      }}
    >
      {children}
    </ActionFlowContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useActionFlow(): ActionFlowContextValue {
  const ctx = useContext(ActionFlowContext);
  if (!ctx) throw new Error("useActionFlow must be used inside <ActionFlowProvider>");
  return ctx;
}
