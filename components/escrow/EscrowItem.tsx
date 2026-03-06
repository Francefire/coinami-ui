"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import { useActionFlow } from "@/context/ActionFlowContext";
import { signTransaction, type TxFields } from "@/lib/crypto";
import { postTx, ApiError, type EscrowEntry } from "@/lib/api";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useState } from "react";
import VisualizationToggle from "@/components/visualizations/VisualizationToggle";
import EscrowStateMachine from "@/components/visualizations/EscrowStateMachine";

interface EscrowItemProps {
  id: string;
  entry: EscrowEntry;
}

const STATUS_BADGE: Record<EscrowEntry["status"], React.ReactNode> = {
  locked: (
    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20">
      Locked
    </Badge>
  ),
  released: (
    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
      Released
    </Badge>
  ),
  refunded: (
    <Badge className="bg-muted text-muted-foreground hover:bg-muted">
      Refunded
    </Badge>
  ),
};

export default function EscrowItem({ id, entry }: EscrowItemProps) {
  const { wallet, nodeUrl, refreshData } = useWallet();
  const flow = useActionFlow();
  const [loading, setLoading] = useState<"release" | "cancel" | null>(null);

  const isReceiver = wallet.address === entry.receiver;
  const isSender = wallet.address === entry.sender;

  async function act(action: "release_escrow" | "cancel_escrow") {
    if (!wallet.privateKeyHex || !wallet.publicKeyHex || !wallet.address) return;

    const isRelease = action === "release_escrow";
    const actionLabel = isRelease ? "Releasing" : "Cancelling";
    const { startFlow, advanceStep, failStep, completeFlow } = flow;

    startFlow({
      type: action,
      title: `${actionLabel} Escrow — ${entry.amount} COIN`,
      steps: [
        { id: "build", title: `Building ${actionLabel} Transaction`, description: `Creating ${action} transaction for escrow ${id.slice(0, 12)}…` },
        { id: "sign", title: "Signing with Private Key", description: "SECP256K1 ECDSA signature over the deterministic JSON payload." },
        { id: "broadcast", title: "Broadcasting to Network", description: "Sending signed transaction to the connected node." },
        { id: "mempool", title: "Accepted into Mempool", description: `Escrow ${isRelease ? "release" : "cancellation"} pending — will take effect once mined.` },
      ],
      nextActions: [
        { label: "Mine a Block", tab: "network" },
      ],
    });

    const txFields: TxFields = {
      type_tx: action,
      sender_address:
        action === "release_escrow" ? wallet.address : entry.sender,
      receiver_address: entry.receiver,
      amount: 0,
      nonce: Date.now(),
      payload: { public_key: wallet.publicKeyHex, escrow_id: id },
    };

    // Step 1 → 2: Build done
    advanceStep(`Escrow ID: ${id.slice(0, 16)}…`);

    setLoading(isRelease ? "release" : "cancel");
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

      toast.success(
        `${isRelease ? "Released" : "Cancelled"} escrow. Tx: ${res.hash.slice(0, 12)}…`
      );
      setTimeout(refreshData, 500);
    } catch (e) {
      if (e instanceof ApiError) {
        failStep(`Node rejected: ${e.message}`);
        toast.error(`Node rejected: ${e.message}`);
      } else {
        failStep("Network error — is the node running?");
        toast.error("Transaction failed.");
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background/50 p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground font-mono break-all">
            ID: {id.slice(0, 24)}…
          </p>
          <p className="text-lg font-semibold tracking-tight">
            {entry.amount} <span className="text-sm text-primary font-normal">COIN</span>
          </p>
        </div>
        {STATUS_BADGE[entry.status]}
      </div>

      {/* Address rows */}
      <div className="text-xs text-muted-foreground flex flex-col gap-1">
        <span>
          <span className="text-foreground/50">From: </span>
          <span className="font-mono">{entry.sender}</span>
          {isSender && (
            <span className="ml-1 text-primary">(you)</span>
          )}
        </span>
        <span>
          <span className="text-foreground/50">To: </span>
          <span className="font-mono">{entry.receiver}</span>
          {isReceiver && (
            <span className="ml-1 text-primary">(you)</span>
          )}
        </span>
      </div>

      {/* Actions */}
      {entry.status === "locked" && (
        <div className="flex gap-2 pt-1">
          {isReceiver && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              disabled={loading !== null}
              onClick={() => act("release_escrow")}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {loading === "release" ? "Releasing…" : "Release Funds"}
            </Button>
          )}
          {isSender && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              disabled={loading !== null}
              onClick={() => act("cancel_escrow")}
            >
              <ShieldOff className="h-3.5 w-3.5" />
              {loading === "cancel" ? "Cancelling…" : "Cancel / Refund"}
            </Button>
          )}
        </div>
      )}

      {/* Per-escrow state machine */}
      <VisualizationToggle label="Show State Machine">
        <EscrowStateMachine entry={entry} />
      </VisualizationToggle>
    </div>
  );
}
