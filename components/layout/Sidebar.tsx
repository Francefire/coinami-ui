"use client";

import { cn } from "@/lib/utils";
import {
  Wallet,
  ShieldCheck,
  Radio,
  Blocks,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import type { Tab } from "./Dashboard";

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const NAV_ITEMS: { tab: Tab; label: string; icon: React.ElementType }[] = [
  { tab: "wallet", label: "Wallet", icon: Wallet },
  { tab: "escrow", label: "Escrow", icon: ShieldCheck },
  { tab: "network", label: "Network", icon: Radio },
  { tab: "explorer", label: "Explorer", icon: Blocks },
];

export default function Sidebar({ activeTab, onTabChange }: Props) {
  const { wallet, lock } = useWallet();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Coinami
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {NAV_ITEMS.map(({ tab, label, icon: Icon }) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {activeTab === tab && (
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            )}
          </button>
        ))}
      </nav>

      {/* Footer: address + lock */}
      <div className="border-t border-border p-3">
        {wallet.address && (
          <div className="mb-2 px-3 py-1">
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Address</p>
            <p className="truncate font-mono text-xs text-foreground">
              {wallet.address.slice(0, 8)}…{wallet.address.slice(-6)}
            </p>
          </div>
        )}
        <button
          onClick={lock}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Lock Wallet
        </button>
      </div>
    </aside>
  );
}
