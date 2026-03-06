"use client";

import { WalletProvider, useWallet } from "@/context/WalletContext";
import UnlockScreen from "@/components/auth/UnlockScreen";

function AppContent() {
  const { wallet } = useWallet();

  if (!wallet.isUnlocked) {
    return <UnlockScreen />;
  }

  // Dashboard will replace this placeholder in Phase 6
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Dashboard coming in Phase 6…</p>
    </div>
  );
}

export default function Home() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
