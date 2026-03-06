"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import { useSSEEvent } from "@/context/EventContext";
import { useActionFlow } from "@/context/ActionFlowContext";
import { mine, sync, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Pickaxe, RefreshCw } from "lucide-react";
import MiningVisualizer from "@/components/visualizations/MiningVisualizer";
import VisualizationToggle from "@/components/visualizations/VisualizationToggle";
import { type Block } from "@/lib/api";

export default function NodeControls({ onMineStart, onSyncStart }: { onMineStart?: () => void; onSyncStart?: () => void }) {
  const { nodeUrl, data, refreshData } = useWallet();
  const flow = useActionFlow();
  const [mining, setMining] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [minedBlock, setMinedBlock] = useState<Block | null>(null);

  // SSE: when ANY source starts mining, show the visualization
  useSSEEvent("block:mining_started", () => {
    if (!mining) setMining(true);
  });

  // SSE: when mining completes (from any source), show the result
  useSSEEvent("block:mining_completed", (evt) => {
    setMining(false);
    // If the event includes block data, use it for visualization
    if (evt.data?.block) {
      setMinedBlock(evt.data.block as Block);
    }
  });

  async function handleMine() {
    const { startFlow, advanceStep, failStep, completeFlow } = flow;
    const txCount = data.mempool.length;

    startFlow({
      type: "mine",
      title: "Mining a Block",
      steps: [
        { id: "collect", title: "Collecting Transactions", description: `Gathering ${txCount} transaction${txCount !== 1 ? "s" : ""} from the mempool.` },
        { id: "header", title: "Building Block Header", description: "Assembling prev_hash, merkle_root, timestamp, and nonce into the block header." },
        { id: "pow", title: "Proof of Work (PoW)", description: "Searching for a nonce that produces a hash with sufficient leading zeros." },
        { id: "mined", title: "Block Mined!", description: "Valid nonce found — block is ready to be added to the chain." },
        { id: "broadcast-block", title: "Broadcasting Block", description: "Sending the new block to all connected peers." },
      ],
      nextActions: [
        { label: "View in Explorer", tab: "network" },
        { label: "Send Coins", tab: "wallet" },
      ],
    });

    setMining(true);
    setMinedBlock(null);
    onMineStart?.();

    // Step 1 → 2: Collected txs
    advanceStep(`${txCount} transaction${txCount !== 1 ? "s" : ""} collected`);

    // Step 2 → 3: Header built, now PoW
    const prevHash = data.chain.length > 0
      ? data.chain[data.chain.length - 1].header.hash
      : "0".repeat(64);
    advanceStep(`prev_hash: ${prevHash.slice(0, 16)}…`);

    const id = toast.loading("Mining… Searching for valid nonce.");
    try {
      const res = await mine(nodeUrl);
      toast.dismiss(id);

      // Step 3 → 4: PoW found
      advanceStep(`Nonce: ${res.block.header.nonce} → Hash: ${res.hash.slice(0, 24)}…`);

      // Step 4 → 5: Block mined, broadcasting
      advanceStep(`Block added to chain at height ${data.chain.length + 1}`);

      // Complete
      completeFlow(
        { hash: res.hash },
        [
          { label: "View in Explorer", tab: "network" },
          { label: "Send Coins", tab: "wallet" },
        ],
      );

      toast.success(`Block mined! Hash: ${res.hash.slice(0, 16)}…`);
      setMinedBlock(res.block);
      setTimeout(refreshData, 500);
    } catch (e) {
      toast.dismiss(id);
      if (e instanceof ApiError) {
        failStep(`Mining failed: ${e.message}`);
        toast.error(`Mining failed: ${e.message}`);
      } else {
        failStep("Mining failed — network error.");
        toast.error("Mining failed.");
      }
    } finally {
      setMining(false);
    }
  }

  async function handleSync() {
    const { startFlow, advanceStep, failStep, completeFlow } = flow;

    startFlow({
      type: "sync",
      title: "Syncing Chain",
      steps: [
        { id: "sync", title: "Requesting Chain from Peers", description: "Asking connected peers for their chain data." },
        { id: "validate", title: "Validating Received Chain", description: "Checking if the peer's chain is valid and longer than ours." },
      ],
      nextActions: [
        { label: "View Chain", tab: "network" },
      ],
    });

    setSyncing(true);
    onSyncStart?.();
    try {
      const res = await sync(nodeUrl);
      advanceStep(`Received chain of length ${res.length}`);

      completeFlow(
        { detail: `Chain synced to ${res.length} blocks.` },
        [{ label: "View in Explorer", tab: "network" }],
      );

      toast.success(`Chain synced. Length: ${res.length} blocks.`);
      setTimeout(refreshData, 500);
    } catch (e) {
      if (e instanceof ApiError) {
        failStep(`Sync failed: ${e.message}`);
        toast.error(`Sync failed: ${e.message}`);
      } else {
        failStep("Sync failed — network error.");
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
