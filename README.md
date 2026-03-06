# 🪙 Coinami Web UI

A modern, consumer-facing Light Wallet and Network Dashboard for the Coinami Blockchain.

Built as a Single Page Application (SPA), this interface allows users to manage their cryptographic identities, interact with smart contracts (Escrow), and visually monitor the Coinami peer-to-peer network—all without needing to run a full Python node locally.

## 🚀 Tech Stack

This project is bootstrapped with `create-next-app`.

* **Framework:** Next.js 16
* **UI Library:** React 19
* **Styling:** Tailwind CSS 4
* **Language:** TypeScript

## 🏗️ Architecture & Security

This UI operates on a **Light Wallet** architecture. It relies entirely on client-side cryptography to guarantee that your Python nodes never handle unencrypted private keys.

| Component | Strategy |
| :--- | :--- |
| **Key Storage** | Private keys are encrypted via AES-GCM (using a user passphrase) and saved in the browser's `localStorage`. |
| **Transaction Signing** | Raw keys only exist in memory while unlocked. Payloads are hashed deterministically and signed locally using `@noble/secp256k1`. |
| **Network Sync** | The UI uses REST API polling (`GET /chain`, `GET /state`) to stay synchronized with the connected Python node. |

## ✨ Core Features

### 1. 👛 Secure Light Wallet

* Generate, import, and manage SECP256K1 keypairs.
* Send standard transfers and claim the daily 50 COIN reward directly from the UI.

### 2. 🤝 Escrow Smart Contracts

* Create trustless trades by locking funds in a smart contract.
* Easily view active Escrow contracts and trigger `release` or `refund` state changes based on your role (Sender/Receiver).

### 3. 🌐 Network Control Room

* Monitor connected peers and view the live Mempool.
* Manually trigger the Proof of Work (PoW) `mine` and `sync` endpoints on your connected node to confirm transactions.

### 4. 🔗 Block Explorer

* A visual, interactive timeline of the blockchain.
* Inspect block headers, Merkle roots, nonces, and deep-dive into transaction payloads.

---

## 🛠️ Getting Started

### Prerequisites

* Node.js (v18+)
* A running instance of the **Coinami Python Node** (e.g., listening on `http://localhost:5000`).

### Installation

1. **Clone the repository and install dependencies:**

```bash
   npm install
```

2. **Configure your Node connection:**

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_NODE_URL=http://localhost:5000
```

3. **Start the development server:**

```bash
npm run dev
```


Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) with your browser to see the result. The page auto-updates as you edit the files.

## 📖 Recommended Next Steps for Development

1. Modify `app/page.tsx` to set up the dashboard layout (Sidebar + Main Content).
2. Install cryptographic libraries: `npm install @noble/secp256k1 crypto-js`.
3. Create a `utils/crypto.ts` file to mirror the Python backend's exact hashing and signing logic.
