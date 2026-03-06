"use client";

import NodeControls from "./NodeControls";
import MempoolList from "./MempoolList";
import PeerList from "./PeerList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NetworkTab() {
  return (
    <div className="flex flex-col gap-6 py-2">
      <NodeControls />

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
