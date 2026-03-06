"use client";

import { useWallet } from "@/context/WalletContext";
import BlockChain from "./BlockChain";
import { Layers } from "lucide-react";

export default function ExplorerTab() {
  const { data } = useWallet();
  const length = data.chain?.length ?? 0;

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center gap-3">
        <Layers className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-sm font-semibold leading-tight">Block Explorer</h2>
          <p className="text-xs text-muted-foreground">
            {length} block{length !== 1 ? "s" : ""} on chain
          </p>
        </div>
      </div>

      <BlockChain />
    </div>
  );
}
