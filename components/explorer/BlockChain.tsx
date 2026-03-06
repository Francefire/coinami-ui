"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import BlockCard from "./BlockCard";
import { type Block } from "@/lib/api";
import { Layers } from "lucide-react";

export default function BlockChain() {
  const { data } = useWallet();
  const blocks: Block[] = data.chain ?? [];
  const [highlightedHash, setHighlightedHash] = useState<string | null>(null);
  const [prevLength, setPrevLength] = useState(blocks.length);
  const [newBlockHash, setNewBlockHash] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect new block arrival
  useEffect(() => {
    if (blocks.length > prevLength && blocks.length > 0) {
      const newest = blocks[blocks.length - 1];
      setNewBlockHash(newest.header.hash);
      const t = setTimeout(() => setNewBlockHash(null), 2000);
      setPrevLength(blocks.length);
      return () => clearTimeout(t);
    }
    if (blocks.length !== prevLength) {
      setPrevLength(blocks.length);
    }
  }, [blocks, prevLength]);

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <Layers className="h-8 w-8 opacity-30" />
        <p className="text-sm">No blocks yet.</p>
      </div>
    );
  }

  // Render newest first
  const ordered = [...blocks].reverse();

  return (
    <div ref={containerRef} className="relative flex flex-col gap-0">
      <AnimatePresence initial={false}>
        {ordered.map((block, i) => {
          const prevBlock = i < ordered.length - 1 ? ordered[i + 1] : null;
          const isLinked =
            prevBlock !== null &&
            block.header.prev_hash === prevBlock.header.hash;
          const isNew = block.header.hash === newBlockHash;
          const isHighlightTarget =
            highlightedHash !== null &&
            block.header.prev_hash === highlightedHash;
          const isHighlightSource =
            highlightedHash !== null &&
            block.header.hash === highlightedHash;

          return (
            <motion.div
              key={block.header.hash}
              layout
              initial={isNew ? { opacity: 0, y: -30, scale: 0.95 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
              className="relative flex flex-col"
            >
              {/* Animated chain connection */}
              {i < ordered.length - 1 && (
                <div className="relative h-8 flex items-center pl-[1.35rem]">
                  {/* Vertical track */}
                  <div className="absolute left-[1.35rem] top-0 bottom-0 w-px bg-border" />

                  {/* Animated fill on top of track */}
                  {isLinked && (
                    <motion.div
                      className="absolute left-[1.35rem] top-0 w-px bg-primary"
                      initial={{ height: 0 }}
                      animate={{ height: "100%" }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    />
                  )}

                  {/* Flowing particle */}
                  {isLinked && (
                    <motion.div
                      className="absolute left-[calc(1.35rem-2px)] w-[5px] h-[5px] rounded-full bg-primary"
                      style={{
                        boxShadow: "0 0 6px 1px oklch(0.75 0.15 196 / 0.5)",
                      }}
                      animate={{ top: ["0%", "100%"] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  )}

                  {/* Hash linkage label on hover */}
                  {(isHighlightTarget || isHighlightSource) && (
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-6 text-[9px] text-primary bg-primary/5 border border-primary/20 rounded px-2 py-0.5"
                    >
                      prev_hash → hash
                    </motion.div>
                  )}
                </div>
              )}

              {/* Dot + card */}
              <div className="flex items-start gap-3">
                <div className="mt-4 shrink-0 flex flex-col items-center">
                  <motion.div
                    animate={
                      isNew
                        ? {
                            boxShadow: [
                              "0 0 0px oklch(0.75 0.15 196 / 0)",
                              "0 0 12px oklch(0.75 0.15 196 / 0.5)",
                              "0 0 4px oklch(0.75 0.15 196 / 0.2)",
                            ],
                          }
                        : {}
                    }
                    transition={{ duration: 1.5 }}
                    className={`w-3 h-3 rounded-full border-2 z-10 ${
                      i === 0
                        ? "border-primary bg-primary/30"
                        : isHighlightSource || isHighlightTarget
                        ? "border-primary bg-primary/20"
                        : "border-border bg-background"
                    }`}
                  />
                </div>
                <div className="flex-1 mb-1">
                  <BlockCard
                    block={block}
                    prevBlockHash={
                      prevBlock ? prevBlock.header.hash : null
                    }
                    isGenesis={i === ordered.length - 1}
                    isHighlighted={isHighlightSource || isHighlightTarget}
                    onHashHover={(hash) => setHighlightedHash(hash)}
                    onHashLeave={() => setHighlightedHash(null)}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
