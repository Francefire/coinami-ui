"use client";

import { useWallet } from "@/context/WalletContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRightLeft, Inbox } from "lucide-react";

export default function MempoolList() {
  const { data } = useWallet();
  const txs = data.mempool ?? [];

  if (txs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <Inbox className="h-8 w-8 opacity-30" />
        <p className="text-sm">Mempool is empty.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-64 pr-1">
      <div className="flex flex-col gap-2">
        {txs.map((tx, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-background/50 p-3 flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-2 min-w-0">
              <ArrowRightLeft className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-xs font-mono text-muted-foreground truncate">
                  {tx.sender_address}
                </p>
                <p className="text-xs text-foreground">
                  {tx.type_tx}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge variant="outline" className="text-xs font-mono">
                {tx.amount} COIN
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
