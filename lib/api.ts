/**
 * API layer — typed fetch wrappers for all Coinami node endpoints
 *
 * All functions accept nodeUrl as first param (e.g. "http://localhost:5000").
 * Throws an ApiError on non-2xx responses with the server's error detail.
 */

// ---------------------------------------------------------------------------
// Types matching backend response shapes
// ---------------------------------------------------------------------------

export interface EscrowEntry {
  sender: string;
  receiver: string;
  amount: number;
  status: "locked" | "released" | "refunded";
}

export interface StateResponse {
  balances: Record<string, number>;
  escrow: Record<string, EscrowEntry>;
}

export interface TxPayload {
  type_tx: string;
  sender_address: string;
  receiver_address: string;
  amount: number;
  nonce: number;
  payload: Record<string, unknown>;
  signature: string;
}

export interface TxResponse {
  status: string;
  hash: string;
}

export interface BlockHeader {
  prev_hash: string;
  merkle_root: string;
  timestamp: number;
  nonce: number;
  hash: string;
}

export interface Block {
  header: BlockHeader;
  transactions: TxPayload[];
}

export interface ChainResponse {
  length: number;
  blocks: Block[];
}

export interface MempoolResponse {
  length: number;
  transactions: TxPayload[];
}

export interface PeersResponse {
  peers: string[];
}

export interface MineResponse {
  status: string;
  hash: string;
  block: Block;
}

export interface SyncResponse {
  status: string;
  length: number;
}

export interface AddPeersResponse {
  added: string[];
  total: number;
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 8_000;

async function apiFetch<T>(
  url: string,
  init?: RequestInit,
  timeoutMs: number = TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? err.message : "Network error");
  } finally {
    if (timer !== null) clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail ?? body?.message ?? detail;
    } catch {
      // ignore JSON parse failure
    }
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** GET /chain — returns full blockchain */
export function getChain(nodeUrl: string): Promise<ChainResponse> {
  return apiFetch<ChainResponse>(`${nodeUrl}/chain`);
}

/** GET /state — returns balances + escrow dict */
export function getState(nodeUrl: string): Promise<StateResponse> {
  return apiFetch<StateResponse>(`${nodeUrl}/state`);
}

/** GET /mempool — returns pending transactions */
export function getMempool(nodeUrl: string): Promise<MempoolResponse> {
  return apiFetch<MempoolResponse>(`${nodeUrl}/mempool`);
}

/** GET /peers — returns list of peer node URLs */
export function getPeers(nodeUrl: string): Promise<PeersResponse> {
  return apiFetch<PeersResponse>(`${nodeUrl}/peers`);
}

/** POST /tx — broadcast a signed transaction */
export function postTx(nodeUrl: string, tx: TxPayload): Promise<TxResponse> {
  return apiFetch<TxResponse>(`${nodeUrl}/tx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tx),
  });
}

/** GET /mine — mine a new block from the mempool (no timeout — PoW can be slow) */
export function mine(nodeUrl: string): Promise<MineResponse> {
  return apiFetch<MineResponse>(`${nodeUrl}/mine`, undefined, 0);
}

/** POST /sync — replace chain with the longest valid chain from peers */
export function sync(nodeUrl: string): Promise<SyncResponse> {
  return apiFetch<SyncResponse>(`${nodeUrl}/sync`, { method: "POST" });
}

/** POST /peers — register new peer nodes */
export function addPeers(
  nodeUrl: string,
  peers: string[]
): Promise<AddPeersResponse> {
  return apiFetch<AddPeersResponse>(`${nodeUrl}/peers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ peers }),
  });
}
