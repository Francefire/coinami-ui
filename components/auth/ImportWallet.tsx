"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/context/WalletContext";
import { Download, ChevronLeft } from "lucide-react";

interface Props {
  onBack: () => void;
}

export default function ImportWallet({ onBack }: Props) {
  const { importWallet } = useWallet();

  const [privKeyHex, setPrivKeyHex] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    const trimmed = privKeyHex.trim().toLowerCase();

    if (!/^[0-9a-f]{64}$/.test(trimmed)) {
      setError("Private key must be a 64-character hex string (32 bytes).");
      return;
    }
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
      await importWallet(trimmed, password);
      // Wallet is now unlocked — page.tsx will render Dashboard
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import wallet.");
    } finally {
      setLoading(false);
    }
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
          <h2 className="text-xl font-semibold text-foreground">Import Wallet</h2>
          <p className="text-sm text-muted-foreground">
            Paste your 64-character hex private key to import.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="iw-privkey">Private Key (hex)</Label>
          <Textarea
            id="iw-privkey"
            placeholder="e.g. a1b2c3d4… (64 hex chars)"
            rows={3}
            value={privKeyHex}
            onChange={(e) => setPrivKeyHex(e.target.value)}
            className="font-mono text-sm resize-none"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="iw-password">New Password</Label>
          <Input
            id="iw-password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="iw-confirm">Confirm Password</Label>
          <Input
            id="iw-confirm"
            type="password"
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleImport()}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-semibold text-primary">🔒 Security note:</span>{" "}
        Your private key is encrypted with your password and stored only in this
        browser. The raw key is never saved or transmitted.
      </div>

      <Button onClick={handleImport} disabled={loading} className="w-full gap-2">
        <Download className="h-4 w-4" />
        {loading ? "Importing…" : "Import Wallet"}
      </Button>
    </div>
  );
}
