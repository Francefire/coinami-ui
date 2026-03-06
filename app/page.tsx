"use client";

import { WalletProvider, useWallet } from "@/context/WalletContext";
import UnlockScreen from "@/components/auth/UnlockScreen";
import Dashboard from "@/components/layout/Dashboard";
import WalletTab from "@/components/wallet/WalletTab";
import EscrowTab from "@/components/escrow/EscrowTab";
import NetworkTab from "@/components/network/NetworkTab";
import ExplorerTab from "@/components/explorer/ExplorerTab";

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
          {activeTab === "escrow" && <EscrowTab />}
          {activeTab === "network" && <NetworkTab />}
          {activeTab === "explorer" && <ExplorerTab />}
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
