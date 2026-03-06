# Coinami Wallet UI — Copilot Instructions

## Project Overview

This is **coinami-ui**, the frontend for the Coinami blockchain wallet. It is a Next.js 16 application (App Router, `"use client"` components) that communicates with a Python/FastAPI blockchain node.

**Backend repository:** `https://github.com/Francefire/Coinami` — branch `develop`  
Key backend files to check when debugging:
- [`src/crypto/wallet.py`](https://github.com/Francefire/Coinami/blob/develop/src/crypto/wallet.py) — SECP256K1 key generation, signing, verification
- [`src/crypto/utils.py`](https://github.com/Francefire/Coinami/blob/develop/src/crypto/utils.py) — `hash_data()`: `json.dumps(data, sort_keys=True)` → SHA-256 hex
- [`src/core/transaction.py`](https://github.com/Francefire/Coinami/blob/develop/src/core/transaction.py) — `Transaction.to_dict()`, `calculate_hash()`, `is_valid()`
- [`src/contracts/state.py`](https://github.com/Francefire/Coinami/blob/develop/src/contracts/state.py) — all smart contract logic (claim, escrow, transfer)
- [`src/p2p/node.py`](https://github.com/Francefire/Coinami/blob/develop/src/p2p/node.py) — FastAPI routes (`/tx`, `/chain`, `/state`, `/mempool`, `/peers`, `/mine`, `/sync`)

---

## Tech Stack

| Layer | Library / Version |
|---|---|
| Framework | Next.js 16.1.6, App Router |
| Language | TypeScript 5, React 19 |
| Styling | Tailwind CSS 4 (dark-first, no light mode) |
| UI Components | shadcn/ui (Radix primitives), lucide-react icons, sonner toasts |
| Crypto | `@noble/secp256k1` ^3.0.0, `@noble/hashes` ^2.0.1 |
| Encryption | Web Crypto API (PBKDF2-SHA256 → AES-GCM-256) |
| State | React Context (`WalletContext`) |

---

## Critical: Cryptographic Signing Pipeline

This **must** match the Python backend exactly or transaction validation will silently fail.

### Python pipeline (source of truth)
```python
# 1. Serialize tx dict WITHOUT signature, sorted keys, no spaces
json_str = json.dumps(tx.to_dict(), sort_keys=True)  # e.g. amount=50.0 → "50.0"
# 2. SHA-256 hex of that string
tx_hash = hashlib.sha256(json_str.encode("utf-8")).hexdigest()
# 3. Sign: cryptography lib re-hashes internally with SHA-256
signature = private_key.sign(tx_hash.encode("utf-8"), ec.ECDSA(hashes.SHA256()))
# Final: DER-encoded bytes → hex string
```

### TypeScript equivalent (`lib/crypto.ts`)
```ts
// TX_FLOAT_FIELDS = new Set(["amount"])
// amount is a Python float → must serialize as "50.0" not "50"
deterministicStringify(txDict, TX_FLOAT_FIELDS)  //  → sorted-key JSON
sha256(utf8(jsonStr))                             // → txHash (hex)
secp.signAsync(sha256(utf8(txHash)), privKey,     // SHA-256 again (prehash=false)
  { format: 'der', prehash: false, lowS: false })
```

### Known gotcha — float serialization
Python's `json.dumps` always serializes `float` fields with a decimal point, even for whole numbers (`50.0` → `"50.0"`). JavaScript has no `float` vs `int` distinction, so `deterministicStringify` must be told which fields are Python floats. The `TX_FLOAT_FIELDS` set in `lib/crypto.ts` lists these. **If you add a new transaction type with float fields beyond `amount`, add them to `TX_FLOAT_FIELDS`.**

### Address derivation
```
address = SHA256(uncompressed_pubkey_65_bytes)[-20 bytes:].hex()
```

---

## Project Structure

```
coinami-ui/
├── app/
│   ├── globals.css          # Dark-first CSS vars (oklch cyan primary)
│   ├── layout.tsx           # html.dark, TooltipProvider, Toaster
│   └── page.tsx             # Root: WalletProvider → gate on isUnlocked → Dashboard
├── components/
│   ├── auth/                # UnlockScreen, CreateWallet, ImportWallet
│   ├── layout/              # Dashboard (render-prop), Sidebar (4 tabs), TopBar (node URL)
│   ├── wallet/              # WalletTab, BalanceCard (claim), SendForm
│   ├── escrow/              # EscrowTab, CreateEscrowForm, EscrowList, EscrowItem
│   ├── network/             # NetworkTab, NodeControls (mine/sync), PeerList, MempoolList
│   └── explorer/            # ExplorerTab, BlockChain (timeline), BlockCard (expandable)
├── context/
│   └── WalletContext.tsx    # Global state, 5s polling, wallet actions
└── lib/
    ├── api.ts               # Typed fetch wrappers for all 8 node endpoints
    ├── crypto.ts            # Key generation, signing, address derivation
    └── storage.ts           # AES-GCM wallet encryption (Web Crypto API)
```

---

## WalletContext

`useWallet()` exposes:

```ts
wallet: {
  isUnlocked: boolean;
  address: string | null;
  publicKeyHex: string | null;  // 65-byte uncompressed X962 hex
  privateKeyHex: string | null;
}
data: {
  balances: Record<string, number>;
  escrow: Record<string, EscrowEntry>;  // keys: sender, receiver, amount, status
  mempool: TxPayload[];
  chain: Block[];
  peers: string[];
}
nodeUrl: string;           // set via TopBar; default "http://localhost:5000"
refreshData: () => void;   // manual poll trigger
```

Polling runs every 5 seconds via `setInterval` when the wallet is unlocked.

---

## API Endpoints (`lib/api.ts`)

All functions take `nodeUrl` as first argument and throw `ApiError` on non-2xx.

| Function | Method | Path | Returns |
|---|---|---|---|
| `getChain` | GET | `/chain` | `ChainResponse` |
| `getState` | GET | `/state` | `StateResponse` |
| `getMempool` | GET | `/mempool` | `MempoolResponse` |
| `getPeers` | GET | `/peers` | `PeersResponse` |
| `postTx` | POST | `/tx` | `TxResponse { status, hash }` |
| `mine` | GET | `/mine` | `MineResponse { status, hash, block }` |
| `sync` | GET | `/sync` | `SyncResponse { status, length }` |
| `addPeers` | POST | `/peers` | `AddPeersResponse { added, total }` |

The node returns `400 "Transaction invalid or already received"` for **any** rejection (bad signature, insufficient balance, cooldown, duplicate). Check the error message for the specific reason; do not treat all 400s as the same error.

---

## Transaction Types

Every transaction requires:
- `type_tx`, `sender_address`, `receiver_address`, `amount`, `nonce: Date.now()`, `payload: { public_key: publicKeyHex }`, `signature`

| type_tx | Special rules |
|---|---|
| `transfer` | `amount > 0`, sender must have sufficient balance |
| `claim` | `amount === 50.0`, `sender === receiver`, 24h cooldown per address |
| `create_escrow` | `payload.escrow_id` (UUID), deducted from sender |
| `release_escrow` | `amount === 0`, `sender_address` must be the **receiver** of the escrow |
| `cancel_escrow` | `amount === 0`, `sender_address` must be the **sender** of the escrow |

---

## Storage (`lib/storage.ts`)

Wallet private key is encrypted with AES-GCM-256 using PBKDF2-SHA256 (310 000 iterations). Stored in `localStorage` under `coinami_wallet`. The `decryptFromStorage(password)` function returns `{ privateKeyHex, address, publicKeyHex }`.

---

## Theme

Dark-first: no light mode. Primary accent is `oklch(0.75 0.15 196)` (cyan). CSS vars are in `app/globals.css` as `:root` (there is no `.dark {}` override — dark IS the root).

---

## Common Pitfalls

1. **`@noble/hashes` import** — must use `@noble/hashes/sha2.js` (with `.js` extension) due to the package exports map.
2. **`secp.utils.randomSecretKey()`** — renamed from `randomPrivateKey` in v2+.
3. **`signAsync` return** — returns a raw `Uint8Array` when `{ format: 'der' }` is passed (not a `Signature` object).
4. **Web Crypto `ArrayBuffer` types** — when passing `Uint8Array` buffers to Web Crypto API, cast via `.buffer.slice(byteOffset, byteOffset + byteLength) as ArrayBuffer`.
5. **Float JSON mismatch** — see critical section above. Any new `float` field in the Python `Transaction.to_dict()` must be added to `TX_FLOAT_FIELDS` in `lib/crypto.ts`.
6. **Escrow `sender`/`receiver` fields** — the backend `EscrowEntry` uses `sender` and `receiver` (not `sender_address`/`receiver_address`). The `EscrowEntry` interface in `lib/api.ts` reflects this.
