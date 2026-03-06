"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  generateKeypair,
  importPrivateKey,
  type KeyPair,
} from "@/lib/crypto";
import {
  encryptAndStore,
  decryptFromStorage,
  hasStoredWallet,
  clearWallet,
  getStoredWalletMeta,
} from "@/lib/storage";
import {
  getChain,
  getState,
  getMempool,
  getPeers,
  type Block,
  type EscrowEntry,
  type TxPayload,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WalletState {
  /** Wallet is unlocked and private key is in memory */
  isUnlocked: boolean;
  address: string | null;
  publicKeyHex: string | null;
  /** Raw private key bytes — only non-null when unlocked */
  privateKeyHex: string | null;
}

export interface PolledData {
  balances: Record<string, number>;
  escrow: Record<string, EscrowEntry>;
  mempool: TxPayload[];
  chain: Block[];
  peers: string[];
}

interface WalletContextValue {
  // ---- wallet identity ----
  wallet: WalletState;
  hasWallet: boolean; // stored (encrypted) wallet exists in localStorage

  // ---- network ----
  nodeUrl: string;
  isConnected: boolean;
  setNodeUrl: (url: string) => void;

  // ---- polled chain data ----
  data: PolledData;
  refreshData: () => void;

  // ---- actions ----
  createWallet: (password: string) => Promise<KeyPair>;
  importWallet: (privateKeyHex: string, password: string) => Promise<KeyPair>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  removeWallet: () => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_NODE_URL = "http://localhost:5000";

const defaultData: PolledData = {
  balances: {},
  escrow: {},
  mempool: [],
  chain: [],
  peers: [],
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    isUnlocked: false,
    address: null,
    publicKeyHex: null,
    privateKeyHex: null,
  });
  const [hasWallet, setHasWallet] = useState(false);
  const [nodeUrl, setNodeUrlState] = useState(DEFAULT_NODE_URL);
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState<PolledData>(defaultData);

  // Stable ref to avoid stale closure in setInterval
  const nodeUrlRef = useRef(nodeUrl);
  nodeUrlRef.current = nodeUrl;

  // ---------------------------------------------------------------------------
  // On mount: restore metadata (address/pubkey) from localStorage
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setHasWallet(hasStoredWallet());
    const meta = getStoredWalletMeta();
    if (meta) {
      setWallet((w) => ({
        ...w,
        address: meta.address,
        publicKeyHex: meta.publicKeyHex,
      }));
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Polling — fetch state/mempool/chain every 5s
  // ---------------------------------------------------------------------------
  const fetchAll = useCallback(async (url: string) => {
    try {
      const [stateRes, mempoolRes, chainRes, peersRes] = await Promise.all([
        getState(url),
        getMempool(url),
        getChain(url),
        getPeers(url),
      ]);
      setData({
        balances: stateRes.balances,
        escrow: stateRes.escrow,
        mempool: mempoolRes.transactions,
        chain: chainRes.blocks,
        peers: peersRes.peers,
      });
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }, []);

  const refreshData = useCallback(() => {
    fetchAll(nodeUrlRef.current);
  }, [fetchAll]);

  useEffect(() => {
    fetchAll(nodeUrl);
    const id = setInterval(() => fetchAll(nodeUrlRef.current), 5_000);
    return () => clearInterval(id);
  }, [nodeUrl, fetchAll]);

  // ---------------------------------------------------------------------------
  // setNodeUrl — update + immediately re-check connection
  // ---------------------------------------------------------------------------
  const setNodeUrl = useCallback(
    (url: string) => {
      const trimmed = url.trimEnd().replace(/\/$/, "");
      setNodeUrlState(trimmed);
      fetchAll(trimmed);
    },
    [fetchAll]
  );

  // ---------------------------------------------------------------------------
  // createWallet
  // ---------------------------------------------------------------------------
  const createWallet = useCallback(async (password: string): Promise<KeyPair> => {
    const kp = generateKeypair();
    await encryptAndStore(kp.privateKeyHex, password, kp.address, kp.publicKeyHex);
    setHasWallet(true);
    setWallet({
      isUnlocked: true,
      address: kp.address,
      publicKeyHex: kp.publicKeyHex,
      privateKeyHex: kp.privateKeyHex,
    });
    return kp;
  }, []);

  // ---------------------------------------------------------------------------
  // importWallet
  // ---------------------------------------------------------------------------
  const importWallet = useCallback(
    async (privKeyHex: string, password: string): Promise<KeyPair> => {
      const kp = importPrivateKey(privKeyHex);
      await encryptAndStore(kp.privateKeyHex, password, kp.address, kp.publicKeyHex);
      setHasWallet(true);
      setWallet({
        isUnlocked: true,
        address: kp.address,
        publicKeyHex: kp.publicKeyHex,
        privateKeyHex: kp.privateKeyHex,
      });
      return kp;
    },
    []
  );

  // ---------------------------------------------------------------------------
  // unlock
  // ---------------------------------------------------------------------------
  const unlock = useCallback(async (password: string) => {
    const privKeyHex = await decryptFromStorage(password);
    const kp = importPrivateKey(privKeyHex);
    setWallet({
      isUnlocked: true,
      address: kp.address,
      publicKeyHex: kp.publicKeyHex,
      privateKeyHex: kp.privateKeyHex,
    });
  }, []);

  // ---------------------------------------------------------------------------
  // lock — wipe private key from memory, keep address/pubkey for display
  // ---------------------------------------------------------------------------
  const lock = useCallback(() => {
    setWallet((w) => ({ ...w, isUnlocked: false, privateKeyHex: null }));
  }, []);

  // ---------------------------------------------------------------------------
  // removeWallet — full reset
  // ---------------------------------------------------------------------------
  const removeWallet = useCallback(() => {
    clearWallet();
    setHasWallet(false);
    setWallet({
      isUnlocked: false,
      address: null,
      publicKeyHex: null,
      privateKeyHex: null,
    });
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        hasWallet,
        nodeUrl,
        isConnected,
        setNodeUrl,
        data,
        refreshData,
        createWallet,
        importWallet,
        unlock,
        lock,
        removeWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
