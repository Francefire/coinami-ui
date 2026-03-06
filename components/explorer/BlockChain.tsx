"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import { useSSEEvent } from "@/context/EventContext";
import BlockCard from "./BlockCard";
import { type Block } from "@/lib/api";
import { Layers, ChevronRight } from "lucide-react";

export default function BlockChain() {
  const { data } = useWallet();
  const blocks: Block[] = useMemo(() => data.chain ?? [], [data.chain]);
  const [highlightedHash, setHighlightedHash] = useState<string | null>(null);
  const [expandedHashes, setExpandedHashes] = useState<Set<string>>(new Set());
  const [newBlockHash, setNewBlockHash] = useState<string | null>(null);

  useSSEEvent("block:validated", (evt) => {
    const hash = evt.data?.hash as string | undefined;
    if (hash) {
      setNewBlockHash(hash);
      setTimeout(() => setNewBlockHash(null), 3000);
    }
  });

  useSSEEvent("block:mining_completed", (evt) => {
    const hash = evt.data?.hash as string | undefined;
    if (hash) {
      setNewBlockHash(hash);
      setTimeout(() => setNewBlockHash(null), 3000);
    }
  });
  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Layers className="h-10 w-10 opacity-20" />
        <p className="text-sm">No blocks on chain yet</p>
        <p className="text-xs text-muted-foreground/60">
          Mine a block to get started
        </p>
      </div>
    );
  }

  // Newest first
  const ordered = [...blocks].reverse();

  return (
    <div className="overflow-x-auto pb-2 max-w-full">
      <div className="flex flex-row items-start gap-0 min-w-min">
        {ordered.map((block, i) => {
          const nextInChain =
            i < ordered.length - 1 ? ordered[i + 1] : null;
          const isLinked =
            nextInChain !== null &&
            block.header.prev_hash === nextInChain.header.hash;
          const isNew = block.header.hash === newBlockHash;
          const blockIndex = blocks.length - 1 - i;
          const isExpanded = expandedHashes.has(block.header.hash);

          const isCardHighlighted =
            highlightedHash !== null &&
            block.header.hash === highlightedHash;

          const connectorHighlighted =
            highlightedHash !== null &&
            nextInChain !== null &&
            nextInChain.header.hash === highlightedHash;

          return (
            <div
              key={block.header.hash}
              className="flex flex-row items-center shrink-0"
            >
              {/* Block card */}
              <motion.div
                animate={{ width: isExpanded ? 384 : 224 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <BlockCard
                  block={block}
                  index={blockIndex}
                  isGenesis={i === ordered.length - 1}
                  isNew={isNew}
                  isHighlighted={isCardHighlighted}
                  onHashHover={(hash) => setHighlightedHash(hash)}
                  onHashLeave={() => setHighlightedHash(null)}
                  onExpandChange={(exp) =>
                    setExpandedHashes((prev) => {
                      const next = new Set(prev);
                      if (exp) next.add(block.header.hash);
                      else next.delete(block.header.hash);
                      return next;
                    })
                  }
                />
              </motion.div>

              {/* Horizontal connector arrow */}
              {i < ordered.length - 1 && (
                <div className="flex flex-row items-center px-0.5">
                  <motion.div
                    className={`h-px w-4 transition-colors duration-200 ${
                      connectorHighlighted
                        ? "bg-primary shadow-[0_0_8px_1px] shadow-primary/50"
                        : isLinked
                        ? "bg-primary/25"
                        : "bg-border/30"
                    }`}
                  />
                  <ChevronRight
                    className={`h-3 w-3 -ml-1.5 transition-colors duration-200 ${
                      connectorHighlighted
                        ? "text-primary"
                        : isLinked
                        ? "text-primary/25"
                        : "text-border/30"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
