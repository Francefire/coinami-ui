"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { type Block } from "@/lib/api";
import {
  ChevronDown,
  GitBranch,
  ArrowRightLeft,
  Clock,
  Pickaxe,
} from "lucide-react";

interface BlockCardProps {
  block: Block;
  index: number;
  isGenesis: boolean;
  isNew?: boolean;
  isHighlighted?: boolean;
  onHashHover?: (hash: string) => void;
  onHashLeave?: () => void;
}

/* 4×2 color grid derived from hash bytes — gives each block a unique visual */
function HashArt({ hash, size = 7 }: { hash: string; size?: number }) {
  const cells = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < 16; i += 2) {
      const byte = parseInt(hash.slice(i, i + 2), 16);
      const hue = (byte / 255) * 360;
      result.push(`oklch(0.55 0.13 ${hue.toFixed(0)})`);
    }
    return result;
  }, [hash]);

  return (
    <div
      className="grid grid-cols-4 gap-[2px]"
      style={{ width: size * 4 + 6, height: size * 2 + 2 }}
    >
      {cells.map((color, i) => (
        <div
          key={i}
          className="rounded-[1px]"
          style={{ backgroundColor: color, width: size, height: size }}
        />
      ))}
    </div>
  );
}

function formatTs(ts: number): string {
  const d = new Date(ts * 1000);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTsFull(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncate(hex: string, chars = 10): string {
  return hex.length > chars ? `${hex.slice(0, chars)}…` : hex;
}

function MerkleTree({ txHashes }: { txHashes: string[] }) {
  const levels = useMemo(() => {
    if (txHashes.length === 0) return [];
    const result: string[][] = [txHashes];
    let current = txHashes;
    while (current.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = current[i + 1] || left;
        next.push(left.slice(0, 4) + right.slice(0, 4) + "…");
      }
      result.push(next);
      current = next;
    }
    return result.reverse();
  }, [txHashes]);

  if (levels.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      {levels.map((level, li) => (
        <div
          key={li}
          className="flex items-center gap-1.5 flex-wrap justify-center"
        >
          {level.map((hash, hi) => (
            <div
              key={hi}
              className={`font-mono text-[8px] px-1.5 py-0.5 rounded ${
                li === 0
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {truncate(hash, 10)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function BlockCard({
  block,
  index,
  isGenesis,
  isNew = false,
  isHighlighted = false,
  onHashHover,
  onHashLeave,
}: BlockCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMerkle, setShowMerkle] = useState(false);
  const h = block.header;
  const txCount = block.transactions.length;

  const txDisplayHashes = useMemo(
    () => block.transactions.map((tx) => tx.signature.slice(0, 16)),
    [block.transactions]
  );

  const txTypes = useMemo(() => {
    const types = new Set(block.transactions.map((tx) => tx.type_tx));
    return Array.from(types);
  }, [block.transactions]);

  return (
    <motion.div
      layout
      className={`
        relative rounded-xl border overflow-hidden cursor-pointer
        transition-all duration-200
        ${
          isHighlighted
            ? "border-primary/70 shadow-[0_0_24px_-4px] shadow-primary/40 bg-primary/[0.04]"
            : "border-border/50 bg-card hover:border-border hover:bg-accent/20"
        }
        ${isNew ? "ring-1 ring-primary/40" : ""}
      `}
      onClick={() => setExpanded((v) => !v)}
      initial={isNew ? { scale: 0.9, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Top accent bar */}
      <div
        className={`h-[3px] ${
          isGenesis
            ? "bg-gradient-to-r from-primary via-primary/60 to-transparent"
            : txCount > 0
            ? "bg-gradient-to-r from-primary/40 to-transparent"
            : "bg-border/20"
        }`}
      />

      {/* Compact body */}
      <div className="px-3 py-2.5 flex items-center gap-3">
        {/* Hash art + block number */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <HashArt hash={h.hash} />
          <span className="text-[10px] font-bold text-primary">#{index}</span>
        </div>

        {/* Center info */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[11px] text-foreground/70 truncate hover:text-primary transition-colors"
              onMouseEnter={(e) => {
                e.stopPropagation();
                onHashHover?.(h.hash);
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                onHashLeave?.();
              }}
            >
              {truncate(h.hash, 16)}
            </span>
            {isGenesis && (
              <Badge
                variant="outline"
                className="text-[8px] px-1 py-0 border-primary/30 text-primary h-3.5"
              >
                GENESIS
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <ArrowRightLeft className="h-2.5 w-2.5" />
              {txCount} tx{txCount !== 1 ? "s" : ""}
            </span>
            {txTypes.slice(0, 2).map((t) => (
              <span
                key={t}
                className="px-1 py-px rounded bg-muted/60 text-[8px]"
              >
                {t}
              </span>
            ))}
            <span className="ml-auto">{formatTs(h.timestamp)}</span>
          </div>
        </div>

        {/* Expand indicator */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </motion.div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 pb-3 pt-1 border-t border-border/30 flex flex-col gap-2.5">
              {/* Full hash */}
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
                  Hash
                </p>
                <p
                  className="text-[10px] font-mono break-all text-foreground/80 hover:text-primary transition-colors cursor-pointer leading-relaxed"
                  onMouseEnter={() => onHashHover?.(h.hash)}
                  onMouseLeave={() => onHashLeave?.()}
                >
                  {h.hash}
                </p>
              </div>

              {/* Previous hash */}
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
                  Previous Hash
                </p>
                <p
                  className="text-[10px] font-mono break-all text-foreground/80 hover:text-primary transition-colors cursor-pointer leading-relaxed"
                  onMouseEnter={() =>
                    h.prev_hash && onHashHover?.(h.prev_hash)
                  }
                  onMouseLeave={() => onHashLeave?.()}
                >
                  {h.prev_hash || "—"}
                </p>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-muted/30 rounded-lg px-2 py-1.5">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> Time
                  </p>
                  <p className="font-mono mt-0.5 text-foreground/80">
                    {formatTsFull(h.timestamp)}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg px-2 py-1.5">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Pickaxe className="h-2.5 w-2.5" /> Nonce
                  </p>
                  <p className="font-mono mt-0.5 text-foreground/80">
                    {h.nonce}
                  </p>
                </div>
              </div>

              {/* Merkle root */}
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
                  Merkle Root
                </p>
                <p className="text-[10px] font-mono break-all text-foreground/60 leading-relaxed">
                  {h.merkle_root}
                </p>
              </div>

              {/* Merkle tree toggle */}
              {txCount > 0 && (
                <button
                  onClick={() => setShowMerkle((v) => !v)}
                  className="flex items-center gap-1 text-[9px] text-primary/60 hover:text-primary transition-colors self-start"
                >
                  <GitBranch className="h-2.5 w-2.5" />
                  {showMerkle ? "Hide" : "Show"} Merkle Tree
                </button>
              )}
              <AnimatePresence>
                {showMerkle && txCount > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <MerkleTree txHashes={txDisplayHashes} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Transactions */}
              {txCount > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    Transactions
                  </p>
                  {block.transactions.map((tx, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 bg-background/50 rounded-lg px-2 py-1.5 text-[10px]"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            tx.type_tx === "claim"
                              ? "bg-green-500"
                              : tx.type_tx === "transfer"
                              ? "bg-blue-500"
                              : tx.type_tx.includes("escrow")
                              ? "bg-amber-500"
                              : "bg-muted-foreground"
                          }`}
                        />
                        <span className="font-medium text-foreground/80">
                          {tx.type_tx}
                        </span>
                        <span className="font-mono text-muted-foreground truncate">
                          {truncate(tx.sender_address, 8)} →{" "}
                          {truncate(tx.receiver_address, 8)}
                        </span>
                      </div>
                      <span className="font-mono text-foreground/70 shrink-0">
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
