"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Block } from "@/lib/api";
import { ChevronDown, ChevronUp, Link as LinkIcon } from "lucide-react";

interface BlockCardProps {
  block: Block;
  /** Hash of the preceding block in the chain (for visual linkage) */
  prevBlockHash: string | null;
  isGenesis: boolean;
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

export default function BlockCard({ block, prevBlockHash, isGenesis }: BlockCardProps) {
  const [expanded, setExpanded] = useState(false);
  const h = block.header;

  // A chain link is valid when this block's prev_hash === the actual previous block's hash
  const linkedToPrev =
    prevBlockHash !== null && h.prev_hash === prevBlockHash;

  return (
    <div
      className={`rounded-lg border p-4 flex flex-col gap-3 transition-colors ${
        linkedToPrev
          ? "border-primary/50 shadow-[0_0_12px_0px] shadow-primary/20"
          : "border-border"
      } bg-card`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="font-mono text-xs border-primary/40 text-primary"
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
        <p className="text-xs font-mono text-foreground break-all">{h.hash}</p>
      </div>

      {/* Chain link indicator */}
      {linkedToPrev && (
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <LinkIcon className="h-3 w-3" />
          <span>Linked to previous block</span>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
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
              <p className="font-mono break-all">{h.prev_hash || "—"}</p>
            </div>
          </div>

          {/* Transaction list */}
          {block.transactions.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Transactions
              </p>
              {block.transactions.map((tx, i) => (
                <div
                  key={i}
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
