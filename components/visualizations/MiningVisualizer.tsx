"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { type TxPayload, type Block } from "@/lib/api";
import DataFlowArrow from "./DataFlowArrow";

interface MiningVisualizerProps {
  mempool: TxPayload[];
  prevHash: string;
  /** Called when mining API completes — sync the result into the viz */
  minedBlock?: Block | null;
  isMining: boolean;
  className?: string;
}

/** Generate a fake hash-like hex string */
function fakeHash(leadingZeros: number): string {
  const zeros = "0".repeat(leadingZeros);
  const rest = Array.from({ length: 64 - leadingZeros }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return zeros + rest;
}

function truncate(hex: string, n = 16): string {
  return hex.length > n ? hex.slice(0, n) + "…" : hex;
}

export default function MiningVisualizer({
  mempool,
  prevHash,
  minedBlock,
  isMining,
  className = "",
}: MiningVisualizerProps) {
  const [phase, setPhase] = useState<
    "idle" | "collect" | "header" | "mining" | "done"
  >("idle");
  const [simulatedNonce, setSimulatedNonce] = useState(0);
  const [simulatedHash, setSimulatedHash] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [difficulty] = useState(4); // simulated leading zeros
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  // Start the animation sequence when mining begins
  useEffect(() => {
    if (isMining && phase === "idle") {
      setPhase("collect");
      const t1 = setTimeout(() => setPhase("header"), 1500);
      const t2 = setTimeout(() => setPhase("mining"), 3000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isMining, phase]);

  // Mining simulation loop
  useEffect(() => {
    if (phase !== "mining") return;

    startTimeRef.current = performance.now();
    let nonceCounter = Math.floor(Math.random() * 100000);
    let attemptCount = 0;

    function loop() {
      nonceCounter += Math.floor(Math.random() * 100) + 1;
      attemptCount++;
      const leadingZeros = Math.random() < 0.05 ? 2 : Math.random() < 0.1 ? 1 : 0;
      setSimulatedNonce(nonceCounter);
      setSimulatedHash(fakeHash(leadingZeros));
      setAttempts(attemptCount);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // When real block arrives, show success
  useEffect(() => {
    if (minedBlock && phase === "mining") {
      cancelAnimationFrame(rafRef.current);
      setSimulatedHash(minedBlock.header.hash);
      setSimulatedNonce(minedBlock.header.nonce);
      setTimeout(() => setPhase("done"), 400);
    }
  }, [minedBlock, phase]);

  // Reset when mining stops and we're done
  const reset = useCallback(() => {
    setPhase("idle");
    setSimulatedNonce(0);
    setSimulatedHash("");
    setAttempts(0);
  }, []);

  useEffect(() => {
    if (!isMining && phase === "done") {
      const t = setTimeout(reset, 8000);
      return () => clearTimeout(t);
    }
  }, [isMining, phase, reset]);

  if (phase === "idle") return null;

  return (
    <div
      className={`rounded-xl border border-primary/20 bg-primary/[0.02] p-4 flex flex-col gap-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-primary uppercase tracking-wider">
          Mining Visualization
        </span>
        <Badge
          variant="outline"
          className={`text-[10px] ${
            phase === "done"
              ? "border-emerald-500/40 text-emerald-400"
              : "border-primary/40 text-primary"
          }`}
        >
          {phase === "collect" && "Collecting TXs…"}
          {phase === "header" && "Building Header…"}
          {phase === "mining" && `Mining… (${attempts} attempts)`}
          {phase === "done" && "Block Mined!"}
        </Badge>
      </div>

      {/* Phase 1: Collect transactions */}
      <AnimatePresence mode="wait">
        {phase === "collect" && (
          <motion.div
            key="collect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2"
          >
            <p className="text-xs text-muted-foreground">
              Gathering pending transactions from the mempool into a new block…
            </p>
            <div className="flex flex-wrap gap-2">
              {mempool.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] text-muted-foreground border border-border rounded-md px-3 py-1.5"
                >
                  Empty mempool — coinbase only
                </motion.div>
              ) : (
                mempool.slice(0, 6).map((tx, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -30, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: i * 0.2, type: "spring", stiffness: 200 }}
                    className="text-[11px] font-mono bg-background/80 border border-border rounded-md px-2 py-1 flex items-center gap-1.5"
                  >
                    <span className="text-foreground/70">{tx.type_tx}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {tx.amount}
                    </Badge>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Phase 2: Build header */}
        {phase === "header" && (
          <motion.div
            key="header"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2"
          >
            <p className="text-xs text-muted-foreground">
              Assembling the block header with the previous hash, merkle root, and timestamp…
            </p>
            <div className="rounded-lg border border-border bg-background/80 p-3 flex flex-col gap-1.5">
              {[
                { label: "prev_hash", value: truncate(prevHash, 32), delay: 0 },
                { label: "merkle_root", value: "computing…", delay: 0.3 },
                {
                  label: "timestamp",
                  value: Math.floor(Date.now() / 1000).toString(),
                  delay: 0.6,
                },
                { label: "nonce", value: "???", delay: 0.9 },
              ].map((field) => (
                <motion.div
                  key={field.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: field.delay }}
                  className="flex gap-2 font-mono text-[11px]"
                >
                  <span className="text-emerald-400 w-24 shrink-0">
                    {field.label}
                  </span>
                  <span
                    className={`text-foreground/70 truncate ${
                      field.label === "nonce" ? "text-yellow-400" : ""
                    }`}
                  >
                    {field.value}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase 3: Mining loop */}
        {phase === "mining" && (
          <motion.div
            key="mining"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            <p className="text-xs text-muted-foreground">
              Trying different nonce values until the hash starts with {difficulty}{" "}
              zeros (meets difficulty target)…
            </p>

            <div className="flex items-center gap-3">
              {/* Nonce display */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Nonce
                </span>
                <motion.div
                  className="font-mono text-sm text-yellow-400 tabular-nums bg-yellow-500/5 border border-yellow-500/20 rounded px-3 py-1 min-w-[5rem] text-center"
                  animate={{ opacity: [0.7, 1] }}
                  transition={{ duration: 0.1, repeat: Infinity }}
                >
                  {simulatedNonce}
                </motion.div>
              </div>

              <DataFlowArrow direction="right" length={40} active />

              {/* Hash box */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  SHA-256
                </span>
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0px oklch(0.75 0.15 196 / 0)",
                      "0 0 12px oklch(0.75 0.15 196 / 0.2)",
                      "0 0 0px oklch(0.75 0.15 196 / 0)",
                    ],
                  }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="rounded-lg border-2 border-primary/40 bg-primary/5 px-3 py-1"
                >
                  <span className="text-xs font-bold text-primary">HASH</span>
                </motion.div>
              </div>

              <DataFlowArrow direction="right" length={40} active />

              {/* Result */}
              <div className="flex-1 min-w-0">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground block mb-1">
                  Result
                </span>
                <div className="font-mono text-[11px] bg-background/80 border border-border rounded px-2 py-1 truncate">
                  <span className="text-red-400">
                    {simulatedHash.slice(0, difficulty)}
                  </span>
                  <span className="text-foreground/50">
                    {simulatedHash.slice(difficulty)}
                  </span>
                </div>
              </div>
            </div>

            {/* Difficulty target */}
            <div className="text-[10px] text-muted-foreground flex items-center gap-2">
              <span>Target: hash must start with</span>
              <code className="text-primary font-mono bg-primary/5 px-1 rounded">
                {"0".repeat(difficulty)}...
              </code>
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-red-400"
              >
                ✗ No match yet
              </motion.span>
            </div>
          </motion.div>
        )}

        {/* Phase 4: Done */}
        {phase === "done" && minedBlock && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-3"
          >
            <motion.div
              initial={{ boxShadow: "0 0 0px oklch(0.7 0.18 155 / 0)" }}
              animate={{
                boxShadow: [
                  "0 0 0px oklch(0.7 0.18 155 / 0)",
                  "0 0 24px oklch(0.7 0.18 155 / 0.4)",
                  "0 0 8px oklch(0.7 0.18 155 / 0.15)",
                ],
              }}
              transition={{ duration: 1.5 }}
              className="rounded-lg border border-emerald-500/50 bg-emerald-500/5 p-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
                  className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center"
                >
                  <span className="text-emerald-400 text-sm">✓</span>
                </motion.div>
                <span className="text-sm font-medium text-emerald-400">
                  Valid nonce found!
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {attempts} attempts
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Nonce: </span>
                  <span className="font-mono text-yellow-400">
                    {minedBlock.header.nonce}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Transactions: </span>
                  <span className="font-mono">
                    {minedBlock.transactions.length}
                  </span>
                </div>
              </div>

              <div className="text-[11px]">
                <span className="text-muted-foreground">Hash: </span>
                <span className="font-mono text-emerald-400 break-all">
                  <span className="text-emerald-300 font-bold">
                    {minedBlock.header.hash.slice(0, difficulty)}
                  </span>
                  {minedBlock.header.hash.slice(difficulty)}
                </span>
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-[10px] text-muted-foreground text-center"
            >
              The block is now added to the chain and broadcast to peers
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
