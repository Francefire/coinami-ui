"use client";

import CreateEscrowForm from "./CreateEscrowForm";
import EscrowList from "./EscrowList";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import VisualizationToggle from "@/components/visualizations/VisualizationToggle";
import EscrowStateMachine from "@/components/visualizations/EscrowStateMachine";

export default function EscrowTab() {
  return (
    <div className="flex flex-col gap-6 py-2">
      {/* State Machine Visualization */}
      <Card className="bg-card border-border">
        <CardContent className="pt-5">
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
