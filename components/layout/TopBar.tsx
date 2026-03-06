"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/context/WalletContext";
import { Server, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TopBar() {
  const { nodeUrl, setNodeUrl, isConnected, refreshData } = useWallet();
  const [inputVal, setInputVal] = useState(nodeUrl);
  const [refreshing, setRefreshing] = useState(false);

  // Keep input in sync if context changes externally
  useEffect(() => {
    setInputVal(nodeUrl);
  }, [nodeUrl]);

  function handleBlur() {
    const trimmed = inputVal.trim().replace(/\/$/, "");
    if (trimmed && trimmed !== nodeUrl) {
      setNodeUrl(trimmed);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-card/50 px-5 backdrop-blur-sm">
      {/* Node URL */}
      <div className="flex flex-1 items-center gap-2">
        <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-8 max-w-xs font-mono text-xs bg-secondary/50 border-border focus-visible:ring-primary/50"
          placeholder="http://localhost:5000"
        />
      </div>

      {/* Refresh */}
      <button
        onClick={handleRefresh}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Refresh data"
      >
        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
      </button>

      {/* Connection status */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            isConnected ? "bg-green-400 shadow-[0_0_6px_1px_rgba(74,222,128,0.5)]" : "bg-red-500"
          )}
        />
        <span className={isConnected ? "text-green-400" : "text-red-400"}>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
    </header>
  );
}
