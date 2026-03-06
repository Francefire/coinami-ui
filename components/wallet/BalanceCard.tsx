"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import { signTransaction, type TxFields } from "@/lib/crypto";
import { postTx, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Coins, RefreshCw } from "lucide-react";

export default function BalanceCard() {
  const { wallet, nodeUrl, data, refreshData } = useWallet();
  const [claiming, setClaiming] = useState(false);

  const address = wallet.address ?? "";
  const balance = data.balances[address] ?? 0;

  async function handleClaim() {
    if (!wallet.privateKeyHex || !wallet.publicKeyHex || !address) return;

    const txFields: TxFields = {
      type_tx: "claim",
      sender_address: address,
      receiver_address: address,
      amount: 50.0,
      nonce: Date.now(),
      payload: { public_key: wallet.publicKeyHex },
    };

    setClaiming(true);
    try {
      const signature = await signTransaction(txFields, wallet.privateKeyHex);
      const result = await postTx(nodeUrl, { ...txFields, signature });
      toast.success(`Claim submitted! Tx: ${result.hash.slice(0, 16)}…`);
      setTimeout(refreshData, 500);
    } catch (e) {
      if (e instanceof ApiError) {
        // Surface smart-contract rejection clearly
        const isCooldwon =
          /cooldown|24h|claim/i.test(e.message) || e.status === 400;
        if (isCooldwon) {
          toast.error(
            "Smart Contract Rejected: Cooldown period of 24h active.",
            { description: "You can only claim 50 COIN once every 24 hours." }
          );
        } else {
          toast.error(`Node rejected claim: ${e.message}`);
        }
      } else {
        toast.error("Failed to submit claim. Is the node running?");
      }
    } finally {
      setClaiming(false);
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Balance
          </CardTitle>
          <button
            onClick={refreshData}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-bold tracking-tight text-foreground">
            {balance.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 4,
            })}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">COIN</p>
        </div>

        <Button
          onClick={handleClaim}
          disabled={claiming || !wallet.isUnlocked}
          variant="outline"
          className="gap-2 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary"
        >
          <Coins className="h-4 w-4" />
          {claiming ? "Claiming…" : "Claim 50 COIN"}
        </Button>
      </CardContent>
    </Card>
  );
}
