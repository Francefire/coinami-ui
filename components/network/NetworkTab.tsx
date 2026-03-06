"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import NodeControls from "./NodeControls";
import MempoolList from "./MempoolList";
import PeerList from "./PeerList";
import BlockChain from "@/components/explorer/BlockChain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/context/WalletContext";
import { useSSEEvent } from "@/context/EventContext";
import VisualizationToggle from "@/components/visualizations/VisualizationToggle";
import NetworkTopology from "@/components/visualizations/NetworkTopology";
import { Layers, Blocks, ArrowRightLeft, Pickaxe } from "lucide-react";

export type NetworkEvent = "broadcast" | "sync" | "mine" | "idle";

export default function NetworkTab() {
  const { data } = useWallet();
  const [netEvent, setNetEvent] = useState<NetworkEvent>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fireEvent = useCallback((evt: NetworkEvent, durationMs = 3000) => {
    setNetEvent(evt);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNetEvent("idle"), durationMs);
  }, []);

  // SSE-driven network topology animations
  useSSEEvent(["tx:broadcast", "block:broadcast"], () => {
    fireEvent("broadcast", 3000);
  });

  useSSEEvent(["peer:sync_started", "peer:sync_completed", "peer:sync_replaced"], () => {
    fireEvent("sync", 3000);
  });

  useSSEEvent(["block:mining_started", "block:mining_completed"], () => {
    fireEvent("mine", 5000);
  });

  useSSEEvent("peer:added", () => {
    fireEvent("broadcast", 2000);
  });

  const chain = useMemo(() => data.chain ?? [], [data.chain]);
  const chainLength = chain.length;

  const stats = useMemo(() => {
    const totalTx = chain.reduce((sum, b) => sum + b.transactions.length, 0);
    const avgTx = chainLength > 0 ? (totalTx / chainLength).toFixed(1) : "0";
    return { totalTx, avgTx };
  }, [chain, chainLength]);

  return (
    <div className="flex flex-col gap-6 py-2 min-w-0">
      {/* Network Topology Visualization */}
      {/* Block Explorer */}
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

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Blocks, label: "Blocks", value: chainLength },
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

      <BlockChain />
      <Card className="bg-card border-border">
        <CardContent className="pt-5">
          <VisualizationToggle label="Show Network Topology" defaultOpen>
            <NetworkTopology peers={data.peers} event={netEvent} />
          </VisualizationToggle>
        </CardContent>
      </Card>

      <NodeControls onMineStart={() => fireEvent("mine", 5000)} onSyncStart={() => fireEvent("sync", 3000)} />

      <PeerList />

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Mempool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MempoolList />
        </CardContent>
      </Card>

      
    </div>
  );
}
