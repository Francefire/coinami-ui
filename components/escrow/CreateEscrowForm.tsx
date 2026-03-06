"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/context/WalletContext";
import { useActionFlow } from "@/context/ActionFlowContext";
import { signTransaction, type TxFields } from "@/lib/crypto";
import { postTx, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { ShieldPlus } from "lucide-react";

export default function CreateEscrowForm() {
  const { wallet, nodeUrl, refreshData } = useWallet();
  const flow = useActionFlow();

  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ receiver?: string; amount?: string }>({});

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!/^[0-9a-f]{40}$/.test(receiver.trim().toLowerCase())) {
      errs.receiver = "Must be a valid 40-character hex address.";
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      errs.amount = "Amount must be a positive number.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    if (!wallet.privateKeyHex || !wallet.publicKeyHex || !wallet.address) return;

    const parsedAmount = parseFloat(amount);
    const { startFlow, advanceStep, failStep, completeFlow } = flow;

    startFlow({
      type: "create_escrow",
      title: `Creating Escrow — ${parsedAmount} COIN`,
      steps: [
        { id: "build", title: "Building Escrow Transaction", description: "Generating escrow ID and building the create_escrow transaction." },
        { id: "sign", title: "Signing with Private Key", description: "SECP256K1 ECDSA signature over the deterministic JSON payload." },
        { id: "broadcast", title: "Broadcasting to Network", description: "Sending signed escrow transaction to the connected node." },
        { id: "mempool", title: "Accepted into Mempool", description: "Escrow transaction pending — funds will be locked once mined." },
      ],
      nextActions: [
        { label: "Mine a Block", tab: "network" },
      ],
    });

    const escrowId = crypto.randomUUID();

    const txFields: TxFields = {
      type_tx: "create_escrow",
      sender_address: wallet.address,
      receiver_address: receiver.trim().toLowerCase(),
      amount: parsedAmount,
      nonce: Date.now(),
      payload: { public_key: wallet.publicKeyHex, escrow_id: escrowId },
    };

    // Step 1 → 2: Build done
    advanceStep(`Escrow ID: ${escrowId.slice(0, 16)}… | Amount: ${parsedAmount} COIN`);

    setSubmitting(true);
    try {
      const signature = await signTransaction(txFields, wallet.privateKeyHex);
      // Step 2 → 3: Signed
      advanceStep(`Signature: ${signature.slice(0, 32)}…`);

      const res = await postTx(nodeUrl, { ...txFields, signature });
      // Step 3 → 4: Broadcast done
      advanceStep(`Node accepted — Hash: ${res.hash.slice(0, 24)}…`);

      completeFlow(
        { hash: res.hash },
        [{ label: "Mine a Block", tab: "network" }],
      );

      toast.success(`Escrow created! ID: ${escrowId.slice(0, 12)}… Tx: ${res.hash.slice(0, 12)}…`);
      setReceiver("");
      setAmount("");
      setTimeout(refreshData, 500);
    } catch (e) {
      if (e instanceof ApiError) {
        failStep(`Node rejected: ${e.message}`);
        toast.error(`Node rejected: ${e.message}`);
      } else {
        failStep("Network error — is the node running?");
        toast.error("Failed to create escrow.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Create Escrow
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="escrow-receiver">Receiver Address</Label>
          <Input
            id="escrow-receiver"
            placeholder="40-character hex address"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            className="font-mono text-sm"
          />
          {errors.receiver && (
            <p className="text-xs text-destructive">{errors.receiver}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="escrow-amount">Amount (COIN)</Label>
          <Input
            id="escrow-amount"
            type="number"
            min="0.0001"
            step="any"
            placeholder="e.g. 25"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount}</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          A random Escrow ID will be generated automatically.
          Funds are locked until the receiver releases them or you cancel.
        </p>

        <Button
          onClick={handleCreate}
          disabled={submitting || !wallet.isUnlocked}
          className="w-full gap-2"
        >
          <ShieldPlus className="h-4 w-4" />
          {submitting ? "Creating…" : "Create Escrow"}
        </Button>
      </CardContent>
    </Card>
  );
}
