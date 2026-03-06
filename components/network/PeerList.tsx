"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/context/WalletContext";
import { addPeers, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Network, Plus } from "lucide-react";

export default function PeerList() {
  const { nodeUrl, data, refreshData } = useWallet();
  const [newPeer, setNewPeer] = useState("");
  const [adding, setAdding] = useState(false);

  const peers = data.peers ?? [];

  async function handleAdd() {
    const trimmed = newPeer.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const res = await addPeers(nodeUrl, [trimmed]);
      if (res.added.length > 0) {
        toast.success(`Added ${res.added.length} peer(s). Total: ${res.total}.`);
        setNewPeer("");
        setTimeout(refreshData, 300);
      } else {
        toast.info("No new peers were added (may already exist).");
      }
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(`Failed to add peer: ${e.message}`);
      } else {
        toast.error("Failed to add peer.");
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Peers ({peers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Peer list */}
        {peers.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
            <Network className="h-5 w-5 opacity-30" />
            <span className="text-sm">No peers connected.</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {peers.map((peer, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 bg-background/50 border border-border"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-sm font-mono truncate">{peer}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Add peer */}
        <div className="flex gap-2">
          <Input
            placeholder="http://peer-host:5000"
            value={newPeer}
            onChange={(e) => setNewPeer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="font-mono text-sm"
          />
          <Button size="icon" onClick={handleAdd} disabled={adding || !newPeer.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
