"use client";

import { WalletProvider, useWallet } from "@/context/WalletContext";
import UnlockScreen from "@/components/auth/UnlockScreen";
import Dashboard from "@/components/layout/Dashboard";
import WalletTab from "@/components/wallet/WalletTab";

function AppContent() {
  const { wallet } = useWallet();

  if (!wallet.isUnlocked) {
    return <UnlockScreen />;
  }

  return (
    <Dashboard>
      {(activeTab) => (
        <>
          {activeTab === "wallet" && <WalletTab />}
          {activeTab === "escrow" && <p className="text-muted-foreground text-sm">Escrow tab — coming in Phase 8</p>}
          {activeTab === "network" && <p className="text-muted-foreground text-sm">Network tab — coming in Phase 9</p>}
          {activeTab === "explorer" && <p className="text-muted-foreground text-sm">Block Explorer — coming in Phase 10</p>}
        </>
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
