"use client";

import { WalletProvider, useWallet } from "@/context/WalletContext";
import UnlockScreen from "@/components/auth/UnlockScreen";
import Dashboard from "@/components/layout/Dashboard";

function AppContent() {
  const { wallet } = useWallet();

  if (!wallet.isUnlocked) {
    return <UnlockScreen />;
  }

  return (
    <Dashboard>
      {(activeTab) => (
        <div className="text-muted-foreground text-sm">
          {activeTab === "wallet" && <p>Wallet tab — coming in Phase 7</p>}
          {activeTab === "escrow" && <p>Escrow tab — coming in Phase 8</p>}
          {activeTab === "network" && <p>Network tab — coming in Phase 9</p>}
          {activeTab === "explorer" && <p>Block Explorer — coming in Phase 10</p>}
        </div>
      )}
    </Dashboard>
  );
}

export default function Home() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
