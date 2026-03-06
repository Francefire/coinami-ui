"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type TxPayload } from "@/lib/api";
import {
  CheckCircle2,
  XCircle,
  Shield,
  Wallet,
  FileCheck,
  ArrowRight,
  Inbox,
} from "lucide-react";

interface ValidationFlowProps {
  tx: TxPayload;
  senderBalance?: number;
  autoPlay?: boolean;
  className?: string;
}

interface ValidationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  check: () => boolean;
  detail: string;
}

export default function ValidationFlow({
  tx,
  senderBalance = 0,
  autoPlay = true,
  className = "",
}: ValidationFlowProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  const steps: ValidationStep[] = [
    {
      id: "structure",
      title: "Structure Check",
      description: "Verify all required fields are present",
      icon: <FileCheck className="h-4 w-4" />,
      check: () =>
        !!tx.type_tx &&
        !!tx.sender_address &&
        !!tx.receiver_address &&
        tx.amount !== undefined &&
        !!tx.nonce &&
        !!tx.signature,
      detail: `type_tx: ${tx.type_tx ? "✓" : "✗"}, sender: ${tx.sender_address ? "✓" : "✗"}, receiver: ${tx.receiver_address ? "✓" : "✗"}, amount: ${tx.amount !== undefined ? "✓" : "✗"}, nonce: ${tx.nonce ? "✓" : "✗"}, signature: ${tx.signature ? "✓" : "✗"}`,
    },
    {
      id: "signature",
      title: "Signature Verification",
      description: "Verify ECDSA signature matches public key and tx hash",
      icon: <Shield className="h-4 w-4" />,
      check: () => !!tx.signature && tx.signature.length > 0,
      detail: `Public key from payload + transaction hash → ECDSA verify against signature`,
    },
    {
      id: "balance",
      title: "Balance Check",
      description: "Verify sender has sufficient funds",
      icon: <Wallet className="h-4 w-4" />,
      check: () => {
        if (tx.type_tx === "claim") return true;
        if (tx.type_tx === "release_escrow" || tx.type_tx === "cancel_escrow")
          return true;
        return senderBalance >= tx.amount;
      },
      detail:
        tx.type_tx === "claim"
          ? "Claim transactions create new coins — no balance needed"
          : tx.type_tx === "release_escrow" || tx.type_tx === "cancel_escrow"
          ? "Escrow operations use locked funds — no sender balance needed"
          : `Sender balance: ${senderBalance} COIN, Amount: ${tx.amount} COIN → ${senderBalance >= tx.amount ? "Sufficient" : "INSUFFICIENT"}`,
    },
    {
      id: "type_rules",
      title: "Type-Specific Rules",
      description: getTypeRuleDescription(tx.type_tx),
      icon: <FileCheck className="h-4 w-4" />,
      check: () => {
        switch (tx.type_tx) {
          case "transfer":
            return tx.amount > 0;
          case "claim":
            return (
              tx.amount === 50 &&
              tx.sender_address === tx.receiver_address
            );
          case "create_escrow":
            return tx.amount > 0;
          case "release_escrow":
          case "cancel_escrow":
            return tx.amount === 0;
          default:
            return true;
        }
      },
      detail: getTypeRuleDetail(tx),
    },
    {
      id: "accept",
      title: "Accept into Mempool",
      description: "Transaction passes all checks — accepted for mining",
      icon: <Inbox className="h-4 w-4" />,
      check: () => true,
      detail: "Transaction is valid and will be included in the next mined block",
    },
  ];

  const advance = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= steps.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [steps.length]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const delay = currentStep === -1 ? 500 : 1200;
    const timer = setTimeout(advance, delay);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, advance]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Node Validation
        </span>
        {currentStep >= steps.length - 1 && (
          <button
            onClick={() => {
              setCurrentStep(-1);
              setIsPlaying(true);
            }}
            className="text-[10px] text-primary hover:underline"
          >
            Replay
          </button>
        )}
      </div>

      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isPassed = i < currentStep;
        const passed = step.check();

        return (
          <div key={step.id} className="flex items-start gap-3">
            {/* Step indicator */}
            <div className="flex flex-col items-center shrink-0">
              <AnimatePresence mode="wait">
                {isPassed ? (
                  <motion.div
                    key="done"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      passed
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {passed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </motion.div>
                ) : isActive ? (
                  <motion.div
                    key="active"
                    initial={{ scale: 0.8 }}
                    animate={{
                      scale: 1,
                      boxShadow: [
                        "0 0 0px oklch(0.75 0.15 196 / 0)",
                        "0 0 12px oklch(0.75 0.15 196 / 0.4)",
                        "0 0 0px oklch(0.75 0.15 196 / 0)",
                      ],
                    }}
                    transition={{
                      boxShadow: { duration: 1.5, repeat: Infinity },
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-primary/20 text-primary border border-primary/40"
                  >
                    {step.icon}
                  </motion.div>
                ) : (
                  <motion.div
                    key="pending"
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground"
                  >
                    {step.icon}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Connector */}
              {i < steps.length - 1 && (
                <div className="relative w-px h-4 mt-1">
                  <div className="absolute inset-0 bg-border" />
                  {isPassed && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "100%" }}
                      className={`absolute inset-x-0 top-0 ${
                        passed ? "bg-emerald-500/50" : "bg-red-500/50"
                      }`}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium ${
                    isActive
                      ? "text-primary"
                      : isPassed
                      ? passed
                        ? "text-emerald-400"
                        : "text-red-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>
                {isPassed && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-[10px] ${
                      passed ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {passed ? "PASS" : "FAIL"}
                  </motion.span>
                )}
              </div>

              <AnimatePresence>
                {(isActive || isPassed) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-1 text-[10px] font-mono bg-background/80 border border-border rounded px-2 py-1 text-foreground/70"
                      >
                        {step.detail}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      {/* Final status */}
      <AnimatePresence>
        {currentStep >= steps.length - 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-emerald-400 mt-1"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>Transaction accepted — waiting to be mined into a block</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getTypeRuleDescription(type: string): string {
  switch (type) {
    case "transfer":
      return "Transfer: amount must be positive";
    case "claim":
      return "Claim: amount must be 50, sender must equal receiver, 24h cooldown";
    case "create_escrow":
      return "Create escrow: amount must be positive, escrow_id required";
    case "release_escrow":
      return "Release escrow: amount must be 0, sender must be the escrow receiver";
    case "cancel_escrow":
      return "Cancel escrow: amount must be 0, sender must be the escrow sender";
    default:
      return `Unknown type: ${type}`;
  }
}

function getTypeRuleDetail(tx: TxPayload): string {
  switch (tx.type_tx) {
    case "transfer":
      return `amount = ${tx.amount} > 0 → ${tx.amount > 0 ? "✓" : "✗"}`;
    case "claim":
      return `amount = ${tx.amount} === 50 → ${tx.amount === 50 ? "✓" : "✗"}, sender === receiver → ${tx.sender_address === tx.receiver_address ? "✓" : "✗"}`;
    case "create_escrow":
      return `amount = ${tx.amount} > 0 → ${tx.amount > 0 ? "✓" : "✗"}, escrow_id present → ${tx.payload?.escrow_id ? "✓" : "✗"}`;
    case "release_escrow":
    case "cancel_escrow":
      return `amount = ${tx.amount} === 0 → ${tx.amount === 0 ? "✓" : "✗"}`;
    default:
      return "No specific rules for this type";
  }
}
