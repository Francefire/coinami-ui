"use client";

import { useEffect, useRef } from "react";
import { WalletProvider, useWallet } from "@/context/WalletContext";
import { EventProvider, useEvents } from "@/context/EventContext";
import type { SSEEvent } from "@/lib/sse";
import UnlockScreen from "@/components/auth/UnlockScreen";
import Dashboard from "@/components/layout/Dashboard";
import WalletTab from "@/components/wallet/WalletTab";
import EscrowTab from "@/components/escrow/EscrowTab";
import NetworkTab from "@/components/network/NetworkTab";
import ExplorerTab from "@/components/explorer/ExplorerTab";

// ---------------------------------------------------------------------------
// SSEBridge — wires SSE events to targeted data refreshes in WalletContext
// ---------------------------------------------------------------------------

function SSEBridge() {
  const { refreshSlice, setSSEActive } = useWallet();
  const { subscribe, isSSEConnected } = useEvents();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSlicesRef = useRef(new Set<"state" | "mempool" | "chain" | "peers">());

  // Tell WalletContext whether SSE is active so polling interval adjusts
  useEffect(() => {
    setSSEActive(isSSEConnected);
  }, [isSSEConnected, setSSEActive]);

  // Debounced refresh — batches rapid SSE events into a single API call
  const scheduleRefresh = (...slices: Array<"state" | "mempool" | "chain" | "peers">) => {
    for (const s of slices) pendingSlicesRef.current.add(s);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const batch = Array.from(pendingSlicesRef.current);
      pendingSlicesRef.current.clear();
      if (batch.length > 0) refreshSlice(batch);
    }, 200);
  };

  useEffect(() => {
    const handler = (evt: SSEEvent) => {
      switch (evt.type) {
        case "tx:received":
        case "tx:validated":
        case "tx:rejected":
          scheduleRefresh("mempool", "state");
          break;
        case "tx:broadcast":
          scheduleRefresh("mempool");
          break;
        case "block:mining_completed":
        case "block:validated":
        case "block:received":
          scheduleRefresh("chain", "state", "mempool");
          break;
        case "block:rejected":
        case "block:broadcast":
          break;
        case "block:mining_started":
          break;
        case "claim:received":
        case "claim:validated":
        case "claim:rejected":
          scheduleRefresh("state", "mempool");
          break;
        case "peer:added":
          scheduleRefresh("peers");
          break;
        case "peer:sync_started":
          break;
        case "peer:sync_completed":
        case "peer:sync_replaced":
          scheduleRefresh("chain", "peers", "state");
          break;
        case "mempool:updated":
          scheduleRefresh("mempool");
          break;
        case "state:updated":
          scheduleRefresh("state");
          break;
      }
    };

    return subscribe("*", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe]);

  return null;
}

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
      <EventProvider>
        <SSEBridge />
        <AppContent />
      </EventProvider>
    </WalletProvider>
  );
}
