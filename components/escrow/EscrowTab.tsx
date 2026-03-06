"use client";

import CreateEscrowForm from "./CreateEscrowForm";
import EscrowList from "./EscrowList";
import { Separator } from "@/components/ui/separator";

export default function EscrowTab() {
  return (
    <div className="flex flex-col gap-6 py-2">
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
