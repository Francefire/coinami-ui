"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/context/WalletContext";
import { signTransaction, type TxFields } from "@/lib/crypto";
import { postTx, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { ShieldPlus } from "lucide-react";

export default function CreateEscrowForm() {
  const { wallet, nodeUrl, refreshData } = useWallet();

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

    const escrowId = crypto.randomUUID();

    const txFields: TxFields = {
      type_tx: "create_escrow",
      sender_address: wallet.address,
      receiver_address: receiver.trim().toLowerCase(),
      amount: parseFloat(amount),
      nonce: Date.now(),
      payload: { public_key: wallet.publicKeyHex, escrow_id: escrowId },
    };

    setSubmitting(true);
    try {
      const signature = await signTransaction(txFields, wallet.privateKeyHex);
      const res = await postTx(nodeUrl, { ...txFields, signature });
      toast.success(`Escrow created! ID: ${escrowId.slice(0, 12)}… Tx: ${res.hash.slice(0, 12)}…`);
      setReceiver("");
      setAmount("");
      setTimeout(refreshData, 500);
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(`Node rejected: ${e.message}`);
      } else {
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
