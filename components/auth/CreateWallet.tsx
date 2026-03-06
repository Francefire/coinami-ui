"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/context/WalletContext";
import { KeyRound, Copy, Check, ChevronLeft } from "lucide-react";

interface Props {
  onBack: () => void;
}

type Step = "password" | "reveal";

export default function CreateWallet({ onBack }: Props) {
  const { createWallet } = useWallet();

  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const kp = await createWallet(password);
      setNewAddress(kp.address);
      setStep("reveal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create wallet.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(newAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (step === "reveal") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-foreground">Wallet Created!</h2>
          <p className="text-sm text-muted-foreground">
            Your wallet address is shown below. Save it — it&apos;s your public identity on the network.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-secondary/50 p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Your Address
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all text-sm font-mono text-primary">
              {newAddress}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy address"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-semibold text-primary">🔒 Security note:</span>{" "}
          Your private key never leaves your browser. It is encrypted with your password
          and stored locally. Only the address and encrypted key are persisted.
        </div>

        {/* Wallet is already unlocked in context — page.tsx will render Dashboard */}
        <Button className="w-full">Open Dashboard →</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Create New Wallet</h2>
          <p className="text-sm text-muted-foreground">
            A fresh SECP256K1 keypair will be generated in your browser.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cw-password">Password</Label>
          <Input
            id="cw-password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cw-confirm">Confirm Password</Label>
          <Input
            id="cw-confirm"
            type="password"
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleCreate} disabled={loading} className="w-full gap-2">
        <KeyRound className="h-4 w-4" />
        {loading ? "Generating…" : "Generate Wallet"}
      </Button>
    </div>
  );
}
