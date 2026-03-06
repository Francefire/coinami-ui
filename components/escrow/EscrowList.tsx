"use client";

import { useWallet } from "@/context/WalletContext";
import EscrowItem from "./EscrowItem";
import { ShieldQuestion } from "lucide-react";

export default function EscrowList() {
  const { wallet, data } = useWallet();

  if (!data.escrow) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <ShieldQuestion className="h-8 w-8 opacity-30" />
        <p className="text-sm">Loading escrows…</p>
      </div>
    );
  }

  const relevant = Object.entries(data.escrow).filter(
    ([, entry]) =>
      entry.sender === wallet.address ||
      entry.receiver === wallet.address
  );

  if (relevant.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <ShieldQuestion className="h-8 w-8 opacity-30" />
        <p className="text-sm">No escrows involving your address.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {relevant.map(([id, entry]) => (
        <EscrowItem key={id} id={id} entry={entry} />
      ))}
    </div>
  );
}
