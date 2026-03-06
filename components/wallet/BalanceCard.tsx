"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import { useSSEEvent } from "@/context/EventContext";
import { signTransaction, type TxFields } from "@/lib/crypto";
import { postTx, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Coins, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BalanceCard() {
  const { wallet, nodeUrl, data, refreshData } = useWallet();
  const [claiming, setClaiming] = useState(false);
  const [balancePulse, setBalancePulse] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);

  const address = wallet.address ?? "";
  const balance = data.balances[address] ?? 0;

  // Detect balance changes and trigger pulse animation
  useEffect(() => {
    if (prevBalanceRef.current !== null && prevBalanceRef.current !== balance) {
      setBalancePulse(true);
      const t = setTimeout(() => setBalancePulse(false), 1500);
      return () => clearTimeout(t);
    }
    prevBalanceRef.current = balance;
  }, [balance]);

  // SSE: on state/claim updates, trigger pulse proactively
  useSSEEvent(["state:updated", "claim:validated"], () => {
    setBalancePulse(true);
    setTimeout(() => setBalancePulse(false), 1500);
  });

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
        const isCooldown = /cooldown|24h/i.test(e.message);
        if (isCooldown) {
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
          <p
            className={cn(
              "text-4xl font-bold tracking-tight transition-all duration-500",
              balancePulse
                ? "text-primary scale-105 drop-shadow-[0_0_8px_oklch(0.75_0.15_196_/_0.5)]"
                : "text-foreground"
            )}
          >            {balance.toLocaleString(undefined, {
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
