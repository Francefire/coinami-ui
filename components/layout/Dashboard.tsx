"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActionFlow } from "@/context/ActionFlowContext";
import JourneyGuide from "@/components/flow/JourneyGuide";

export type Tab = "wallet" | "escrow" | "network" | "explorer";

interface Props {
  children: (activeTab: Tab) => React.ReactNode;
}

export default function Dashboard({ children }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("wallet");
  const { setNavigateTab } = useActionFlow();

  // Wire up tab navigation for action flow overlays
  useEffect(() => {
    setNavigateTab(setActiveTab);
  }, [setNavigateTab, setActiveTab]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        <ScrollArea className="flex-1">
          <main className="min-h-full p-6">
            <JourneyGuide activeTab={activeTab} onNavigate={setActiveTab} />
            {children(activeTab)}
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
