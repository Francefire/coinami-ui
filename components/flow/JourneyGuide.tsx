"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";
import {
  Coins,
  Send,
  Pickaxe,
  Blocks,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { Tab } from "@/components/layout/Dashboard";

interface JourneyGuideProps {
  activeTab: Tab;
  onNavigate: (tab: Tab) => void;
}

interface Suggestion {
  key: string;
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  tab?: Tab;
  highlight?: boolean;
}

export default function JourneyGuide({ activeTab, onNavigate }: JourneyGuideProps) {
  const { wallet, data } = useWallet();

  const address = wallet.address ?? "";
  const balance = data.balances[address] ?? 0;
  const mempoolCount = data.mempool.length;
  const chainLength = data.chain.length;

  // Determine the most relevant suggestion based on current state
  const suggestions: Suggestion[] = [];

  if (balance === 0 && mempoolCount === 0) {
    suggestions.push({
      key: "claim",
      icon: Coins,
      title: "Get started — Claim your first coins",
      description: "Claim 50 COIN from the faucet. This creates a transaction that enters the mempool.",
      actionLabel: "Go to Wallet",
      tab: "wallet",
      highlight: true,
    });
  }

  if (balance === 0 && mempoolCount > 0 && activeTab !== "network") {
    suggestions.push({
      key: "mine-first",
      icon: Pickaxe,
      title: "Confirm your transaction",
      description: `${mempoolCount} transaction${mempoolCount > 1 ? "s" : ""} waiting in the mempool. Mine a block to confirm ${mempoolCount > 1 ? "them" : "it"}.`,
      actionLabel: "Mine a Block",
      tab: "network",
      highlight: true,
    });
  }

  if (mempoolCount > 0 && balance > 0 && activeTab !== "network") {
    suggestions.push({
      key: "mine-pending",
      icon: Pickaxe,
      title: `${mempoolCount} pending transaction${mempoolCount > 1 ? "s" : ""}`,
      description: "Mine a block to confirm pending transactions and add them to the blockchain.",
      actionLabel: "Mine a Block",
      tab: "network",
    });
  }

  if (balance > 0 && mempoolCount === 0 && activeTab === "wallet") {
    suggestions.push({
      key: "send",
      icon: Send,
      title: "Send coins to someone",
      description: "Transfer COIN to another address — this will create a signed transaction.",
      actionLabel: "Try Sending",
      tab: "wallet",
    });
  }

  if (chainLength > 1 && activeTab !== "explorer") {
    suggestions.push({
      key: "explore",
      icon: Blocks,
      title: "Explore the blockchain",
      description: `The chain has ${chainLength} blocks. See how blocks link together with hashes and merkle trees.`,
      actionLabel: "View Explorer",
      tab: "explorer",
    });
  }

  // Show only the most relevant suggestion (first match)
  const suggestion = suggestions[0];
  if (!suggestion) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={suggestion.key}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`mb-5 flex items-center gap-4 rounded-xl border p-4 ${
          suggestion.highlight
            ? "border-primary/30 bg-primary/5 shadow-[0_0_20px_oklch(0.75_0.15_196/0.08)]"
            : "border-border bg-card/50"
        }`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            suggestion.highlight
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {suggestion.highlight ? (
            <Sparkles className="h-5 w-5" />
          ) : (
            <suggestion.icon className="h-5 w-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{suggestion.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{suggestion.description}</p>
        </div>

        {suggestion.tab && suggestion.tab !== activeTab && (
          <Button
            onClick={() => onNavigate(suggestion.tab!)}
            size="sm"
            variant={suggestion.highlight ? "default" : "outline"}
            className="shrink-0 gap-1.5"
          >
            {suggestion.actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
