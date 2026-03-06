"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import { useSSEEvent } from "@/context/EventContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRightLeft, Inbox, ChevronDown } from "lucide-react";
import ValidationFlow from "@/components/visualizations/ValidationFlow";

export default function MempoolList() {
  const { data } = useWallet();
  const txs = data.mempool ?? [];
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [flashHash, setFlashHash] = useState<string | null>(null);
  const prevCountRef = useRef(txs.length);

  // SSE: flash highlight when a new TX enters the mempool
  useSSEEvent("tx:validated", (evt) => {
    const hash = evt.data?.hash as string | undefined;
    if (hash) {
      setFlashHash(hash);
      setTimeout(() => setFlashHash(null), 2000);
    }
  });

  // Detect count changes as a fallback flash trigger
  useEffect(() => {
    if (txs.length > prevCountRef.current) {
      // New TX added — flash the first item (newest) briefly
      if (!flashHash) {
        setFlashHash("__new__");
        setTimeout(() => setFlashHash(null), 1500);
      }
    }
    prevCountRef.current = txs.length;
  }, [txs.length, flashHash]);

  if (txs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <Inbox className="h-8 w-8 opacity-30" />
        <p className="text-sm">Mempool is empty.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-80 pr-1">
      <div className="flex flex-col gap-2">
        {txs.map((tx, i) => {
          const isFlashing =
            flashHash === "__new__" ? i === 0 : flashHash && tx.signature?.startsWith(flashHash);
          return (
          <div key={i} className="flex flex-col">
            <button
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              className={`rounded-md border p-3 flex items-start justify-between gap-3 transition-colors text-left w-full ${
                isFlashing
                  ? "border-primary bg-primary/5 shadow-[0_0_12px_0px] shadow-primary/20"
                  : "border-border bg-background/50 hover:border-primary/30"
              }`}
            >
              <div className="flex items-start gap-2 min-w-0">
                <ArrowRightLeft className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {tx.sender_address}
                  </p>
                  <p className="text-xs text-foreground">{tx.type_tx}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs font-mono">
                  {tx.amount} COIN
                </Badge>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                    expandedIdx === i ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            <AnimatePresence>
              {expandedIdx === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="ml-4 mt-2 mb-3 rounded-lg border border-primary/20 bg-primary/[0.02] p-3">
                    <ValidationFlow
                      tx={tx}
                      senderBalance={data.balances[tx.sender_address] ?? 0}
                      autoPlay
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
        })}
      </div>
    </ScrollArea>
  );
}
