"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/context/WalletContext";
import CreateWallet from "./CreateWallet";
import ImportWallet from "./ImportWallet";
import { Wallet, PlusCircle, Download, Unlock } from "lucide-react";

type View = "home" | "create" | "import";

export default function UnlockScreen() {
  const { hasWallet, wallet, unlock } = useWallet();
  const [view, setView] = useState<View>("home");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUnlock() {
    if (!password) return;
    setError("");
    setLoading(true);
    try {
      await unlock(password);
    } catch {
      setError("Wrong password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo / header */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/30">
            <Wallet className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Coinami Wallet
            </h1>
            <p className="text-sm text-muted-foreground">
              A blockchain wallet for the Coinami network
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
          {view === "create" && (
            <CreateWallet onBack={() => setView("home")} />
          )}

          {view === "import" && (
            <ImportWallet onBack={() => setView("home")} />
          )}

          {view === "home" && (
            <>
              {hasWallet ? (
                /* ── Unlock existing wallet ── */
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Welcome back
                    </h2>
                    {wallet.address && (
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                        {wallet.address}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="unlock-password">Password</Label>
                    <Input
                      id="unlock-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                      autoFocus
                    />
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button
                    onClick={handleUnlock}
                    disabled={loading || !password}
                    className="w-full gap-2"
                  >
                    <Unlock className="h-4 w-4" />
                    {loading ? "Unlocking…" : "Unlock Wallet"}
                  </Button>

                  <div className="border-t border-border pt-4 text-center">
                    <button
                      onClick={() => setView("import")}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                    >
                      Import a different wallet
                    </button>
                  </div>
                </div>
              ) : (
                /* ── No wallet yet ── */
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Get Started
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create a new wallet or import an existing one.
                    </p>
                  </div>

                  <Button
                    onClick={() => setView("create")}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Create Wallet
                  </Button>

                  <Button
                    onClick={() => setView("import")}
                    variant="outline"
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Download className="h-4 w-4" />
                    Import Wallet
                  </Button>

                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">🔒 Your keys, your coins.</span>{" "}
                    Keys are generated and encrypted entirely in your browser.
                    They never leave your device.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
