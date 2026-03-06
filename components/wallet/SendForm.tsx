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
import { Send, ChevronDown, ChevronUp } from "lucide-react";
import VisualizationToggle from "@/components/visualizations/VisualizationToggle";
import SigningPipeline from "@/components/visualizations/SigningPipeline";
import ValidationFlow from "@/components/visualizations/ValidationFlow";
import { type TxPayload } from "@/lib/api";

export default function SendForm() {
  const { wallet, nodeUrl, data, refreshData } = useWallet();
  const flow = useActionFlow();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [rawPayload, setRawPayload] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ recipient?: string; amount?: string }>({});
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [lastSentTx, setLastSentTx] = useState<TxPayload | null>(null);

  function validate(): boolean {
    const errs: typeof errors = {};
    const trimmedAddr = recipient.trim().toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(trimmedAddr)) {
      errs.recipient = "Must be a valid 40-character hex address.";
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      errs.amount = "Amount must be a positive number.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function buildAndPreview(): Promise<{ fields: TxFields; signature: string } | null> {
    if (!wallet.privateKeyHex || !wallet.publicKeyHex || !wallet.address) return null;

    const txFields: TxFields = {
      type_tx: "transfer",
      sender_address: wallet.address,
      receiver_address: recipient.trim().toLowerCase(),
      amount: parseFloat(amount),
      nonce: Date.now(),
      payload: { public_key: wallet.publicKeyHex },
    };

    const signature = await signTransaction(txFields, wallet.privateKeyHex);
    return { fields: txFields, signature };
  }

  async function handlePreview() {
    if (!validate()) return;
    try {
      const result = await buildAndPreview();
      if (!result) return;
      setRawPayload(
        JSON.stringify({ ...result.fields, signature: result.signature }, null, 2)
      );
      setShowRaw(true);
    } catch {
      toast.error("Failed to sign transaction.");
    }
  }

  async function handleSend() {
    if (!validate()) return;
    if (!wallet.privateKeyHex || !wallet.publicKeyHex || !wallet.address) return;

    const parsedAmount = parseFloat(amount);
    const { startFlow, advanceStep, failStep, completeFlow } = flow;

    startFlow({
      type: "transfer",
      title: `Sending ${parsedAmount} COIN`,
      steps: [
        { id: "validate", title: "Validating Inputs", description: "Checking recipient address format and amount." },
        { id: "build", title: "Building Transaction", description: "Creating transfer transaction with sorted-key deterministic JSON." },
        { id: "sign", title: "Signing with Private Key", description: "SECP256K1 ECDSA: serialize → SHA-256 → SHA-256 → sign → DER encode." },
        { id: "broadcast", title: "Broadcasting to Network", description: "Sending signed transaction to the connected node." },
        { id: "mempool", title: "Accepted into Mempool", description: "Transaction is pending — waiting to be mined into a block." },
      ],
      nextActions: [
        { label: "Mine a Block", tab: "network" },
        { label: "View Mempool", tab: "network" },
      ],
    });

    // Step 1 → 2: Validation passed
    advanceStep(`To: ${recipient.trim().toLowerCase().slice(0, 12)}… | Amount: ${parsedAmount}`);

    setSending(true);
    try {
      const result = await buildAndPreview();
      if (!result) return;

      // Step 2 → 3: Built, now signing done
      advanceStep(`Nonce: ${result.fields.nonce}`);

      const full = { ...result.fields, signature: result.signature };
      setRawPayload(JSON.stringify(full, null, 2));
      setLastSignature(result.signature);

      // Step 3 → 4: Signed, now broadcasting
      advanceStep(`Signature: ${result.signature.slice(0, 32)}…`);

      const res = await postTx(nodeUrl, full);

      // Step 4 → 5: Broadcast done, in mempool
      advanceStep(`Node accepted — Hash: ${res.hash.slice(0, 24)}…`);

      // Complete the flow
      completeFlow(
        { hash: res.hash },
        [
          { label: "Mine a Block", tab: "network" },
          { label: "View Mempool", tab: "network" },
        ],
      );

      toast.success(`Transaction sent! Tx: ${res.hash.slice(0, 16)}…`);
      setLastSentTx(full);
      setRecipient("");
      setAmount("");
      setRawPayload(null);
      setShowRaw(false);
      setTimeout(refreshData, 500);
    } catch (e) {
      if (e instanceof ApiError) {
        failStep(`Node rejected: ${e.message}`);
        toast.error(`Node rejected: ${e.message}`);
      } else {
        failStep("Network error — is the node running?");
        toast.error("Failed to send transaction.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Send Funds
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="recipient">Recipient Address</Label>
          <Input
            id="recipient"
            placeholder="40-character hex address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="font-mono text-sm"
          />
          {errors.recipient && (
            <p className="text-xs text-destructive">{errors.recipient}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">Amount (COIN)</Label>
          <Input
            id="amount"
            type="number"
            min="0.0001"
            step="any"
            placeholder="e.g. 10"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount}</p>
          )}
        </div>

        {/* Raw data toggle */}
        <div>
          <button
            type="button"
            onClick={rawPayload ? () => setShowRaw((v) => !v) : handlePreview}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showRaw ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {rawPayload ? (showRaw ? "Hide Raw Data" : "Show Raw Data") : "Preview Signed Payload"}
          </button>

          {showRaw && rawPayload && (
            <pre className="mt-2 rounded-lg border border-border bg-secondary/50 p-3 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
              {rawPayload}
            </pre>
          )}
        </div>

        {/* Signing Pipeline Visualization */}
        {wallet.address && wallet.publicKeyHex && recipient.trim() && parseFloat(amount) > 0 && (
          <VisualizationToggle label="Show Signing Pipeline">
            <SigningPipeline
              txFields={{
                type_tx: "transfer",
                sender_address: wallet.address,
                receiver_address: recipient.trim().toLowerCase(),
                amount: parseFloat(amount),
                nonce: Date.now(),
                payload: { public_key: wallet.publicKeyHex },
              }}
              signature={lastSignature ?? undefined}
            />
          </VisualizationToggle>
        )}

        <Button
          onClick={handleSend}
          disabled={sending || !wallet.isUnlocked}
          className="w-full gap-2"
        >
          <Send className="h-4 w-4" />
          {sending ? "Sending…" : "Send"}
        </Button>

        {/* Post-send validation visualization */}
        {lastSentTx && (
          <VisualizationToggle label="Show How Validation Works">
            <ValidationFlow
              tx={lastSentTx}
              senderBalance={wallet.address ? (data.balances[wallet.address] ?? 0) : 0}
              autoPlay
            />
          </VisualizationToggle>
        )}
      </CardContent>
    </Card>
  );
}
