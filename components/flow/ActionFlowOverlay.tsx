"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useActionFlow, type FlowStep, type NextAction } from "@/context/ActionFlowContext";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tab } from "@/components/layout/Dashboard";

// ---------------------------------------------------------------------------
// Individual Step
// ---------------------------------------------------------------------------

function FlowStepRow({ step, index, isLast }: { step: FlowStep; index: number; isLast: boolean }) {
  const statusColors = {
    pending: "border-border bg-muted/30 text-muted-foreground",
    active: "border-primary bg-primary/15 text-primary ring-2 ring-primary/30 shadow-[0_0_16px_oklch(0.75_0.15_196_/_0.25)]",
    done: "border-emerald-500/50 bg-emerald-500/15 text-emerald-400",
    error: "border-destructive/50 bg-destructive/15 text-destructive",
  };

  const lineColors = {
    pending: "bg-border",
    active: "bg-primary/50",
    done: "bg-emerald-500/50",
    error: "bg-destructive/50",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 300, damping: 25 }}
      className="flex gap-4"
    >
      {/* Timeline column */}
      <div className="flex flex-col items-center">
        {/* Circle with icon */}
        <motion.div
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-500",
            statusColors[step.status],
          )}
          animate={
            step.status === "active"
              ? { scale: [1, 1.08, 1] }
              : {}
          }
          transition={
            step.status === "active"
              ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
              : {}
          }
        >
          <AnimatePresence mode="wait">
            {step.status === "done" && (
              <motion.div
                key="done"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Check className="h-5 w-5" />
              </motion.div>
            )}
            {step.status === "error" && (
              <motion.div
                key="error"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <X className="h-5 w-5" />
              </motion.div>
            )}
            {step.status === "active" && (
              <motion.div
                key="active"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Loader2 className="h-5 w-5 animate-spin" />
              </motion.div>
            )}
            {step.status === "pending" && (
              <motion.div
                key="pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
              >
                <FileText className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Connecting line */}
        {!isLast && (
          <div className="relative w-0.5 flex-1 min-h-6 bg-border overflow-hidden">
            <motion.div
              className={cn("absolute inset-x-0 top-0", lineColors[step.status])}
              initial={{ height: "0%" }}
              animate={{ height: step.status === "done" ? "100%" : step.status === "active" ? "50%" : "0%" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      {/* Content column */}
      <div className="flex-1 pb-6 pt-1.5">
        <p
          className={cn(
            "text-sm font-medium transition-colors duration-300",
            step.status === "active" && "text-primary",
            step.status === "done" && "text-emerald-400",
            step.status === "error" && "text-destructive",
            step.status === "pending" && "text-muted-foreground",
          )}
        >
          {step.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
        {step.detail && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-1.5 rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 font-mono text-xs text-muted-foreground break-all"
          >
            {step.detail}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Next Action Button
// ---------------------------------------------------------------------------

function NextActionButton({
  action,
  navigateTab,
  dismissFlow,
}: {
  action: NextAction;
  navigateTab?: (tab: Tab) => void;
  dismissFlow: () => void;
}) {
  const handleClick = () => {
    if (action.action) {
      action.action();
      dismissFlow();
    } else if (action.tab && navigateTab) {
      navigateTab(action.tab);
      dismissFlow();
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className="gap-2 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary"
    >
      <ArrowRight className="h-4 w-4" />
      {action.label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Main Overlay
// ---------------------------------------------------------------------------

export default function ActionFlowOverlay() {
  const { activeFlow, dismissFlow, navigateTab } = useActionFlow();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active step
  useEffect(() => {
    if (!activeFlow) return;
    const activeIdx = activeFlow.currentStepIndex;
    const el = overlayRef.current?.querySelector(`[data-step="${activeIdx}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeFlow?.currentStepIndex, activeFlow]);

  const isDone = activeFlow?.status === "done";
  const isError = activeFlow?.status === "error";
  const canDismiss = isDone || isError;

  return (
    <AnimatePresence>
      {activeFlow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            if (canDismiss && e.target === e.currentTarget) dismissFlow();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5"
          >
            {/* Header */}
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDone && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.div>
                  )}
                  {isError && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                      <X className="h-4 w-4" />
                    </div>
                  )}
                  {!isDone && !isError && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {activeFlow.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isDone
                        ? "Completed successfully"
                        : isError
                          ? "An error occurred"
                          : `Step ${activeFlow.currentStepIndex + 1} of ${activeFlow.steps.length}`}
                    </p>
                  </div>
                </div>

                {canDismiss && (
                  <button
                    onClick={dismissFlow}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    isError ? "bg-destructive" : "bg-primary",
                  )}
                  initial={{ width: "0%" }}
                  animate={{
                    width: `${((activeFlow.steps.filter((s) => s.status === "done").length) / activeFlow.steps.length) * 100}%`,
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Steps */}
            <div ref={overlayRef} className="overflow-y-auto px-6 py-5 max-h-[50vh]">
              {activeFlow.steps.map((step, i) => (
                <div key={step.id} data-step={i}>
                  <FlowStepRow
                    step={step}
                    index={i}
                    isLast={i === activeFlow.steps.length - 1}
                  />
                </div>
              ))}
            </div>

            {/* Result + Next Actions */}
            {(isDone || isError) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="border-t border-border px-6 py-4"
              >
                {/* Result hash */}
                {activeFlow.result?.hash && (
                  <div className="mb-3 rounded-lg border border-border bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      {activeFlow.type === "mine" ? "Block Hash" : "Transaction Hash"}
                    </p>
                    <p className="font-mono text-xs text-foreground break-all">
                      {activeFlow.result.hash}
                    </p>
                  </div>
                )}

                {activeFlow.result?.detail && !activeFlow.result?.hash && (
                  <p className="mb-3 text-sm text-muted-foreground">
                    {activeFlow.result.detail}
                  </p>
                )}

                {/* Next actions */}
                {isDone && activeFlow.nextActions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      What&apos;s next?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeFlow.nextActions.map((action, i) => (
                        <NextActionButton
                          key={i}
                          action={action}
                          navigateTab={navigateTab}
                          dismissFlow={dismissFlow}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Dismiss button for errors */}
                {isError && (
                  <Button
                    onClick={dismissFlow}
                    variant="outline"
                    className="w-full mt-2"
                  >
                    Dismiss
                  </Button>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
