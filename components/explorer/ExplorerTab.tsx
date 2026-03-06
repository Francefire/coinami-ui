"use client";

import { useMemo } from "react";
import { useWallet } from "@/context/WalletContext";
import BlockChain from "./BlockChain";
import { Layers, Blocks, ArrowRightLeft, Pickaxe } from "lucide-react";

export default function ExplorerTab() {
  const { data } = useWallet();
  const chain = data.chain ?? [];
  const length = chain.length;

  const stats = useMemo(() => {
    const totalTx = chain.reduce((sum, b) => sum + b.transactions.length, 0);
    const avgTx = length > 0 ? (totalTx / length).toFixed(1) : "0";
    return { totalTx, avgTx };
  }, [chain, length]);

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
          <Layers className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold leading-tight">
            Block Explorer
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Inspect the chain
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Blocks, label: "Blocks", value: length },
          { icon: ArrowRightLeft, label: "Transactions", value: stats.totalTx },
          { icon: Pickaxe, label: "Avg Tx/Block", value: stats.avgTx },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-border/50 bg-card/50 px-3 py-2.5 flex flex-col items-center text-center gap-1"
          >
            <Icon className="h-3.5 w-3.5 text-primary/70" />
            <p className="text-base font-bold leading-none">{value}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Chain */}
      <BlockChain />
    </div>
  );
}
