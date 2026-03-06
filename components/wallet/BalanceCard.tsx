"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import { useSSEEvent } from "@/context/EventContext";
import { useActionFlow } from "@/context/ActionFlowContext";
import { signTransaction, type TxFields } from "@/lib/crypto";
import { postClaim, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Coins, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BalanceCard() {
  const { wallet, nodeUrl, data, refreshData } = useWallet();
  const flow = useActionFlow();
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

    const { startFlow, advanceStep, failStep, completeFlow } = flow;

    startFlow({
      type: "claim",
      title: "Claiming 50 COIN",
      steps: [
        { id: "build", title: "Building Transaction", description: "Creating claim transaction with your address and a 50.0 COIN reward." },
        { id: "sign", title: "Signing with Private Key", description: "SECP256K1 ECDSA signature: serialize → SHA-256 → SHA-256 → sign → DER encode." },
        { id: "broadcast", title: "Broadcasting to Network", description: "Sending signed transaction to the connected node." },
        { id: "mempool", title: "Accepted into Mempool", description: "Transaction is waiting to be included in the next mined block." },
      ],
      nextActions: [
        { label: "Mine a Block", tab: "network", description: "Confirm this transaction by mining" },
        { label: "View Mempool", tab: "network", description: "See pending transactions" },
      ],
    });

    const txFields: TxFields = {
      type_tx: "claim",
      sender_address: address,
      receiver_address: address,
      amount: 50.0,
      nonce: Date.now(),
      payload: { public_key: wallet.publicKeyHex },
    };

    // Step 1 → 2: Build done, now signing
    advanceStep(`Type: claim | Amount: 50.0 COIN`);

    setClaiming(true);
    try {
      const signature = await signTransaction(txFields, wallet.privateKeyHex);
      // Step 2 → 3: Signed, now broadcasting
      advanceStep(`Signature: ${signature.slice(0, 32)}…`);

      const result = await postClaim(nodeUrl, { ...txFields, signature });
      // Step 3 → 4: Broadcast done, in mempool
      advanceStep(`Node accepted — Hash: ${result.hash.slice(0, 24)}…`);

      // Complete the flow
      completeFlow(
        { hash: result.hash },
        [
          { label: "Mine a Block", tab: "network" },
          { label: "View Mempool", tab: "network" },
        ],
      );

      toast.success(`Claim submitted! Tx: ${result.hash.slice(0, 16)}…`);
      setTimeout(refreshData, 500);
    } catch (e) {
      if (e instanceof ApiError) {
        const isCooldown = /cooldown|24h/i.test(e.message);
        if (isCooldown) {
          failStep("Cooldown active — you can only claim once every 24 hours.");
          toast.error(
            "Smart Contract Rejected: Cooldown period of 24h active.",
            { description: "You can only claim 50 COIN once every 24 hours." }
          );
        } else {
          failStep(`Node rejected: ${e.message}`);
          toast.error(`Node rejected claim: ${e.message}`);
        }
      } else {
        failStep("Network error — is the node running?");
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
