"use client";

import { useState } from "react";
import CreateEscrowForm from "./CreateEscrowForm";
import EscrowList from "./EscrowList";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSSEEvent } from "@/context/EventContext";
import VisualizationToggle from "@/components/visualizations/VisualizationToggle";
import EscrowStateMachine from "@/components/visualizations/EscrowStateMachine";

export default function EscrowTab() {
  const [lastEscrowEvent, setLastEscrowEvent] = useState<string | null>(null);

  // SSE: flash a badge when escrow-related events arrive
  useSSEEvent(["tx:validated", "state:updated"], (evt) => {
    const typeTx = evt.data?.type_tx as string | undefined;
    if (typeTx && (typeTx.includes("escrow") || typeTx === "create_escrow" || typeTx === "release_escrow" || typeTx === "cancel_escrow")) {
      setLastEscrowEvent(typeTx);
      setTimeout(() => setLastEscrowEvent(null), 3000);
    }
  });

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* State Machine Visualization */}
      <Card className="bg-card border-border">
        <CardContent className="pt-5">
          {lastEscrowEvent && (
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 text-primary animate-pulse">
                {lastEscrowEvent.replace("_", " ")} detected
              </Badge>
            </div>
          )}
          <VisualizationToggle label="Show Escrow State Machine" defaultOpen>
            <EscrowStateMachine />
          </VisualizationToggle>
        </CardContent>
      </Card>

      <CreateEscrowForm />
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Your Escrows
          </span>
          <Separator className="flex-1" />
        </div>
        <EscrowList />
      </div>
    </div>
  );
}
