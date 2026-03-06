"use client";

import { useWallet } from "@/context/WalletContext";
import BlockCard from "./BlockCard";
import { type Block } from "@/lib/api";
import { Layers } from "lucide-react";

export default function BlockChain() {
  const { data } = useWallet();
  const blocks: Block[] = data.chain ?? [];
  
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
    <div className="relative flex flex-col gap-0">
      {ordered.map((block, i) => (
          <div key={block.header.hash} className="relative flex flex-col">
            {/* Timeline connector */}
            {i < ordered.length - 1 && (
              <div
                className="absolute left-[1.35rem] top-full w-px bg-border z-0"
                style={{ height: "1.25rem" }}
              />
            )}

            {/* Dot + card */}
            <div className="flex items-start gap-3">
              <div className="mt-4 shrink-0 flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full border-2 z-10 ${
                    i === 0
                      ? "border-primary bg-primary/30"
                      : "border-border bg-background"
                  }`}
                />
              </div>
              <div className="flex-1 mb-5">
                <BlockCard
                  block={block}
                  prevBlockHash={block.header.prev_hash}
                  isGenesis={i === ordered.length - 1}
                />
              </div>
            </div>
          </div>
      ))}
    </div>
  );
}
