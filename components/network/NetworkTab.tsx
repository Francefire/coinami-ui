"use client";

import { useState, useCallback, useRef } from "react";
import NodeControls from "./NodeControls";
import MempoolList from "./MempoolList";
import PeerList from "./PeerList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/context/WalletContext";
import VisualizationToggle from "@/components/visualizations/VisualizationToggle";
import NetworkTopology from "@/components/visualizations/NetworkTopology";

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

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Network Topology Visualization */}
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
