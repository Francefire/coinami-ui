"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StepVisualizer, { type Step } from "./StepVisualizer";
import HexDisplay from "./HexDisplay";
import DataFlowArrow from "./DataFlowArrow";
import { deterministicStringify, hashTxDict } from "@/lib/crypto";
import { sha256 } from "@noble/hashes/sha2.js";

interface SigningPipelineProps {
  txFields: {
    type_tx: string;
    sender_address: string;
    receiver_address: string;
    amount: number;
    nonce: number;
    payload: Record<string, unknown>;
  };
  signature?: string;
  className?: string;
}

const TX_FLOAT_FIELDS = new Set(["amount"]);

/** A styled JSON key-value row */
function JsonRow({
  k,
  v,
  highlight,
  delay,
}: {
  k: string;
  v: string;
  highlight?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
      className="flex gap-1 font-mono text-[11px] leading-snug"
    >
      <span className="text-emerald-400">&quot;{k}&quot;</span>
      <span className="text-muted-foreground">:</span>
      <span className={highlight ? "text-yellow-400" : "text-foreground/80"}>
        {v}
      </span>
      {highlight && (
        <span className="text-[9px] text-yellow-400/60 ml-1">← float</span>
      )}
    </motion.div>
  );
}

export default function SigningPipeline({
  txFields,
  signature,
  className = "",
}: SigningPipelineProps) {
  const jsonStr = useMemo(
    () => deterministicStringify(txFields, TX_FLOAT_FIELDS),
    [txFields]
  );

  const txHashHex = useMemo(
    () => hashTxDict(txFields as unknown as Record<string, unknown>),
    [txFields]
  );

  // We can't easily compute the second hash synchronously in render,
  // but we can show a placeholder or pre-compute it
  const doubleHashDisplay = useMemo(() => {
    const digest = sha256(new TextEncoder().encode(txHashHex));
    return Array.from(digest)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");
  }, [txHashHex]);

  const sortedEntries = useMemo(() => {
    const dict = txFields as unknown as Record<string, unknown>;
    return Object.keys(dict)
      .sort()
      .map((k) => ({
        key: k,
        value: deterministicStringify(dict[k], TX_FLOAT_FIELDS, k),
        isFloat: TX_FLOAT_FIELDS.has(k) && Number.isInteger(dict[k]),
      }));
  }, [txFields]);

  const steps: Step[] = useMemo(
    () => [
      {
        id: "serialize",
        title: "Serialize",
        description:
          "The transaction fields are serialized into deterministic JSON with sorted keys — exactly matching Python's json.dumps(data, sort_keys=True). Notice how integer amounts become floats (50 → 50.0) to match Python's behavior.",
        content: (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-background/80 p-3 flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Sorted Keys → JSON
              </span>
              {sortedEntries.map((entry, i) => (
                <JsonRow
                  key={entry.key}
                  k={entry.key}
                  v={entry.value}
                  highlight={entry.isFloat}
                  delay={i * 0.12}
                />
              ))}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground bg-background/60 rounded p-2 break-all max-h-20 overflow-y-auto">
              {jsonStr}
            </div>
          </div>
        ),
      },
      {
        id: "hash1",
        title: "Hash #1",
        description:
          'The JSON string is hashed with SHA-256 to produce a fixed-length "fingerprint" of the transaction data. Any tiny change in the transaction would produce a completely different hash.',
        content: (
          <div className="flex flex-col items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] font-mono text-muted-foreground bg-background/80 border border-border rounded px-2 py-1 max-w-full text-center truncate"
            >
              JSON string ({jsonStr.length} chars)
            </motion.div>

            <DataFlowArrow direction="down" length={32} active />

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center rounded-lg border-2 border-primary/50 bg-primary/5 px-6 py-2"
            >
              <span className="text-xs font-bold text-primary tracking-wider">
                SHA-256
              </span>
            </motion.div>

            <DataFlowArrow direction="down" length={32} active />

            <HexDisplay
              value={txHashHex}
              label="Transaction Hash (txHash)"
              truncate={64}
            />
          </div>
        ),
      },
      {
        id: "hash2",
        title: "Hash #2",
        description:
          "Python's ECDSA(SHA256) internally hashes the message again before signing. So the txHash hex string is fed into SHA-256 a second time, producing a 32-byte digest — this is what actually gets signed.",
        content: (
          <div className="flex flex-col items-center gap-3">
            <HexDisplay
              value={txHashHex}
              label="txHash (from step 2)"
              truncate={48}
              animate={false}
            />

            <DataFlowArrow direction="down" length={32} active />

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center rounded-lg border-2 border-yellow-500/50 bg-yellow-500/5 px-6 py-2"
            >
              <span className="text-xs font-bold text-yellow-400 tracking-wider">
                SHA-256 (again)
              </span>
            </motion.div>

            <DataFlowArrow direction="down" length={32} active />

            <HexDisplay
              value={doubleHashDisplay}
              label="Message Digest (32 bytes)"
              highlightColor="oklch(0.8 0.15 90)"
              truncate={64}
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-[10px] text-muted-foreground text-center mt-1"
            >
              This double-hashing is why the frontend and backend must follow the
              exact same pipeline
            </motion.p>
          </div>
        ),
      },
      {
        id: "sign",
        title: "ECDSA Sign",
        description:
          "Your private key and the message digest are fed into the ECDSA SECP256K1 algorithm. The result is a signature that proves you authorized this transaction — without revealing your private key.",
        content: (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-end gap-6">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Private Key
                </span>
                <div className="font-mono text-[11px] text-red-400/80 bg-red-500/5 border border-red-500/20 rounded px-2 py-1">
                  ••••••••••••••••
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Digest
                </span>
                <div className="font-mono text-[11px] text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/20 rounded px-2 py-1 max-w-[12rem] truncate">
                  {doubleHashDisplay.slice(0, 24)}…
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DataFlowArrow direction="down" length={28} active />
              <DataFlowArrow direction="down" length={28} active />
            </div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                boxShadow: [
                  "0 0 0px oklch(0.75 0.15 196 / 0)",
                  "0 0 20px oklch(0.75 0.15 196 / 0.3)",
                  "0 0 0px oklch(0.75 0.15 196 / 0)",
                ],
              }}
              transition={{
                scale: { delay: 0.2, duration: 0.3 },
                opacity: { delay: 0.2 },
                boxShadow: { duration: 2, repeat: Infinity },
              }}
              className="flex items-center justify-center rounded-lg border-2 border-primary/50 bg-primary/5 px-6 py-3"
            >
              <span className="text-xs font-bold text-primary tracking-wider">
                ECDSA SECP256K1
              </span>
            </motion.div>

            <DataFlowArrow direction="down" length={28} active />

            {signature ? (
              <HexDisplay
                value={signature}
                label="DER-Encoded Signature"
                truncate={64}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xs text-muted-foreground italic"
              >
                Signature will appear after signing…
              </motion.div>
            )}
          </div>
        ),
      },
      {
        id: "attach",
        title: "Attach",
        description:
          "The DER-encoded signature is attached to the transaction payload. This complete, signed transaction is ready to be broadcast to the network for validation.",
        content: (
          <div className="flex flex-col gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-primary/30 bg-primary/[0.03] p-3"
            >
              <span className="text-[10px] uppercase tracking-wider text-primary/70 block mb-2">
                Signed Transaction
              </span>
              <div className="flex flex-col gap-0.5">
                {sortedEntries.map((entry) => (
                  <div
                    key={entry.key}
                    className="font-mono text-[10px] text-foreground/70"
                  >
                    <span className="text-emerald-400/70">{entry.key}</span>:{" "}
                    {entry.value.length > 30
                      ? entry.value.slice(0, 30) + "…"
                      : entry.value}
                  </div>
                ))}
                <motion.div
                  initial={{ opacity: 0, backgroundColor: "oklch(0.75 0.15 196 / 0.15)" }}
                  animate={{ opacity: 1, backgroundColor: "oklch(0.75 0.15 196 / 0)" }}
                  transition={{ duration: 1.5 }}
                  className="font-mono text-[10px] text-primary rounded px-1 -mx-1"
                >
                  <span className="text-primary">signature</span>:{" "}
                  {signature
                    ? signature.slice(0, 30) + "…"
                    : "pending…"}
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2 text-xs text-emerald-400"
            >
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-emerald-400"
              />
              Ready to broadcast to network
            </motion.div>
          </div>
        ),
      },
    ],
    [sortedEntries, jsonStr, txHashHex, doubleHashDisplay, signature]
  );

  return (
    <StepVisualizer
      steps={steps}
      stepDuration={3000}
      className={className}
    />
  );
}
