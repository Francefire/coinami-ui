"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import { mine, sync, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Pickaxe, RefreshCw } from "lucide-react";
import MiningVisualizer from "@/components/visualizations/MiningVisualizer";
import VisualizationToggle from "@/components/visualizations/VisualizationToggle";
import { type Block } from "@/lib/api";

export default function NodeControls({ onMineStart, onSyncStart }: { onMineStart?: () => void; onSyncStart?: () => void }) {
  const { nodeUrl, data, refreshData } = useWallet();
  const [mining, setMining] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [minedBlock, setMinedBlock] = useState<Block | null>(null);

  async function handleMine() {
    setMining(true);
    setMinedBlock(null);
    onMineStart?.();
    const id = toast.loading("Mining… Searching for valid nonce.");
    try {
      const res = await mine(nodeUrl);
      toast.dismiss(id);
      toast.success(`Block mined! Hash: ${res.hash.slice(0, 16)}…`);
      setMinedBlock(res.block);
      setTimeout(refreshData, 500);
    } catch (e) {
      toast.dismiss(id);
      if (e instanceof ApiError) {
        toast.error(`Mining failed: ${e.message}`);
      } else {
        toast.error("Mining failed.");
      }
    } finally {
      setMining(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    onSyncStart?.();
    try {
      const res = await sync(nodeUrl);
      toast.success(`Chain synced. Length: ${res.length} blocks.`);
      setTimeout(refreshData, 500);
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(`Sync failed: ${e.message}`);
      } else {
        toast.error("Sync failed.");
      }
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Node Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button
          onClick={handleMine}
          disabled={mining || syncing}
          className="gap-2 flex-1"
        >
          <Pickaxe className="h-4 w-4" />
          {mining ? "Mining…" : "Mine Block"}
        </Button>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={mining || syncing}
          className="gap-2 flex-1"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync Chain"}
        </Button>
      </CardContent>

      {/* Mining Visualization */}
      <div className="px-6 pb-4">
        <VisualizationToggle label="Show Mining Process">
          <MiningVisualizer
            mempool={data.mempool}
            prevHash={
              data.chain.length > 0
                ? data.chain[data.chain.length - 1].header.hash
                : "0".repeat(64)
            }
            minedBlock={minedBlock}
            isMining={mining}
          />
        </VisualizationToggle>
      </div>
    </Card>
  );
}
