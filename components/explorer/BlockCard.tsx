"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Block } from "@/lib/api";
import { ChevronDown, ChevronUp, Link as LinkIcon, GitBranch } from "lucide-react";

interface BlockCardProps {
  block: Block;
  prevBlockHash: string | null;
  isGenesis: boolean;
  isHighlighted?: boolean;
  onHashHover?: (hash: string) => void;
  onHashLeave?: () => void;
}

function formatTs(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncate(hex: string, chars = 16): string {
  return hex.length > chars ? `${hex.slice(0, chars)}…` : hex;
}

/** Simple Merkle tree visualization for the expanded block view */
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
        // Simulate combined hash (just take first chars of both for display)
        next.push(left.slice(0, 4) + right.slice(0, 4) + "…");
      }
      result.push(next);
      current = next;
    }
    return result.reverse(); // Root first
  }, [txHashes]);

  if (levels.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
        <GitBranch className="h-3 w-3" />
        <span className="uppercase tracking-wider">Merkle Tree</span>
      </div>
      {levels.map((level, li) => (
        <motion.div
          key={li}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: li * 0.3, duration: 0.3 }}
          className="flex items-center gap-2 flex-wrap justify-center"
        >
          {level.map((hash, hi) => (
            <motion.div
              key={hi}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: li * 0.3 + hi * 0.1 }}
              className={`font-mono text-[9px] px-2 py-0.5 rounded border ${
                li === 0
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background/80 border-border text-muted-foreground"
              }`}
            >
              {truncate(hash, 12)}
            </motion.div>
          ))}
          {li < levels.length - 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: (li + 0.5) * 0.3 }}
              className="w-full flex justify-center"
            >
              <div className="w-px h-2 bg-border" />
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export default function BlockCard({
  block,
  prevBlockHash,
  isGenesis,
  isHighlighted = false,
  onHashHover,
  onHashLeave,
}: BlockCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMerkle, setShowMerkle] = useState(false);
  const h = block.header;

  const linkedToPrev =
    prevBlockHash !== null && h.prev_hash === prevBlockHash;

  // Pseudo tx hashes for Merkle tree (use signature as proxy since we dont have tx hashes)
  const txDisplayHashes = useMemo(
    () => block.transactions.map((tx) => tx.signature.slice(0, 16)),
    [block.transactions]
  );

  return (
    <div
      className={`rounded-lg border p-4 flex flex-col gap-3 transition-all duration-300 ${
        isHighlighted
          ? "border-primary shadow-[0_0_20px_0px] shadow-primary/30"
          : linkedToPrev
          ? "border-primary/50 shadow-[0_0_12px_0px] shadow-primary/20"
          : "border-border"
      } bg-card`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="font-mono text-xs border-primary/40 text-primary cursor-pointer hover:bg-primary/10 transition-colors"
            onMouseEnter={() => onHashHover?.(h.hash)}
            onMouseLeave={() => onHashLeave?.()}
          >
            {truncate(h.hash, 12)}
          </Badge>
          {isGenesis && (
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
              Genesis
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{formatTs(h.timestamp)}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Hash — always visible */}
      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-muted-foreground">Hash</p>
        <p
          className="text-xs font-mono text-foreground break-all cursor-pointer hover:text-primary transition-colors"
          onMouseEnter={() => onHashHover?.(h.hash)}
          onMouseLeave={() => onHashLeave?.()}
        >
          {h.hash}
        </p>
      </div>

      {/* Chain link indicator */}
      {linkedToPrev && (
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <LinkIcon className="h-3 w-3" />
          <span>Linked to previous block</span>
        </div>
      )}

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 pt-2 border-t border-border">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Nonce</p>
                  <p className="font-mono">{h.nonce}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Transactions</p>
                  <p className="font-mono">{block.transactions.length}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Merkle Root</p>
                  <p className="font-mono break-all">{h.merkle_root}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Previous Hash</p>
                  <p
                    className="font-mono break-all cursor-pointer hover:text-primary transition-colors"
                    onMouseEnter={() =>
                      h.prev_hash && onHashHover?.(h.prev_hash)
                    }
                    onMouseLeave={() => onHashLeave?.()}
                  >
                    {h.prev_hash || "—"}
                  </p>
                </div>
              </div>

              {/* Merkle Tree Visualization */}
              {block.transactions.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowMerkle((v) => !v)}
                    className="flex items-center gap-1.5 text-[10px] text-primary/70 hover:text-primary transition-colors"
                  >
                    <GitBranch className="h-3 w-3" />
                    {showMerkle ? "Hide Merkle Tree" : "Show Merkle Tree"}
                  </button>
                  <AnimatePresence>
                    {showMerkle && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <MerkleTree txHashes={txDisplayHashes} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Transaction list */}
              {block.transactions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Transactions
                  </p>
                  {block.transactions.map((tx, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-md bg-background/60 border border-border px-3 py-2 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-foreground font-medium">{tx.type_tx}</span>
                        <span className="font-mono text-muted-foreground truncate">
                          {truncate(tx.sender_address, 18)} → {truncate(tx.receiver_address, 18)}
                        </span>
                      </div>
                      <Badge variant="outline" className="shrink-0 font-mono text-xs">
                        {tx.amount} COIN
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
