/**
 * Cryptographic parity with Python backend (src/crypto/wallet.py)
 *
 * Python signing pipeline:
 *   1. tx.to_dict()  →  dict without "signature"
 *   2. json.dumps(dict, sort_keys=True)  →  deterministic JSON string
 *   3. hashlib.sha256(json_str.encode("utf-8")).hexdigest()  →  txHash (hex)
 *      (this is calculate_hash() / hash_data())
 *   4. private_key.sign(txHash.encode("utf-8"), ec.ECDSA(hashes.SHA256()))
 *      cryptography lib's ECDSA(SHA256) re-hashes the message:
 *        SHA256(txHash_as_utf8_bytes)  →  32-byte digest, then signs
 *   5. signature.hex()  →  DER-encoded hex string
 *
 * Address derivation:
 *   SHA256(uncompressed_pubkey_65_bytes)[-20 bytes:]  →  40-char hex
 */

import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha2.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Encode Uint8Array → lowercase hex string */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Decode hex string → Uint8Array */
export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string length");
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Deterministic JSON serialisation — matches json.dumps(data, sort_keys=True)
// ---------------------------------------------------------------------------

/**
 * Recursively stringify an object with sorted keys.
 * Matches Python: json.dumps(data, sort_keys=True)
 *
 * Rules matching Python's json module:
 *  - Object keys sorted alphabetically
 *  - No extra whitespace (compact)
 *  - Numbers: integers as integers, floats as floats (no trailing .0)
 *  - null → "null", booleans → "true"/"false"
 *  - Strings escaped with double quotes
 */

/**
 * Python model fields typed as `float` are always serialized with a decimal
 * point by json.dumps, even for whole numbers (50.0 → "50.0", not "50").
 * Fields typed as `int` (nonce) must NOT have a decimal.
 * This Set lists the Transaction.to_dict() keys that are Python floats.
 */
const TX_FLOAT_FIELDS = new Set(["amount"]);

export function deterministicStringify(
  value: unknown,
  floatFields?: Set<string>,
  _key?: string
): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    // Whole-number floats must keep their decimal point to match Python json.dumps
    if (Number.isInteger(value) && _key !== undefined && floatFields?.has(_key)) {
      return `${value}.0`;
    }
    return value.toString();
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((v) => deterministicStringify(v, floatFields)).join(", ") + "]";
  }
  if (typeof value === "object") {
    const sorted = Object.keys(value as Record<string, unknown>).sort();
    const pairs = sorted.map(
      (k) =>
        JSON.stringify(k) +
        ": " +
        deterministicStringify((value as Record<string, unknown>)[k], floatFields, k)
    );
    return "{" + pairs.join(", ") + "}";
  }
  throw new Error(`Unserialisable value: ${typeof value}`);
}

// ---------------------------------------------------------------------------
// Transaction hashing — matches Transaction.calculate_hash()
// ---------------------------------------------------------------------------

/** Matches hash_data() in src/crypto/utils.py */
export function hashTxDict(txDict: Record<string, unknown>): string {
  const jsonStr = deterministicStringify(txDict, TX_FLOAT_FIELDS);
  const bytes = new TextEncoder().encode(jsonStr);
  return toHex(sha256(bytes));
}

// ---------------------------------------------------------------------------
// Key/address derivation
// ---------------------------------------------------------------------------

/**
 * Derive the Coinami address from a 65-byte uncompressed public key.
 * address = last 20 bytes of SHA256(pubKeyBytes) as hex
 */
function deriveAddress(pubKeyBytes: Uint8Array): string {
  const hash = sha256(pubKeyBytes);
  return toHex(hash.slice(-20));
}

export interface KeyPair {
  privateKeyHex: string;
  publicKeyHex: string; // 65-byte uncompressed X962, hex
  address: string; // 40-char hex
}

/** Generate a fresh SECP256K1 keypair */
export function generateKeypair(): KeyPair {
  const privKeyBytes = secp.utils.randomSecretKey();
  const pubKeyBytes = secp.getPublicKey(privKeyBytes, false); // uncompressed
  return {
    privateKeyHex: toHex(privKeyBytes),
    publicKeyHex: toHex(pubKeyBytes),
    address: deriveAddress(pubKeyBytes),
  };
}

/** Derive public key + address from a hex-encoded private key */
export function importPrivateKey(privateKeyHex: string): KeyPair {
  const privKeyBytes = fromHex(privateKeyHex);
  const pubKeyBytes = secp.getPublicKey(privKeyBytes, false); // uncompressed
  return {
    privateKeyHex,
    publicKeyHex: toHex(pubKeyBytes),
    address: deriveAddress(pubKeyBytes),
  };
}

// ---------------------------------------------------------------------------
// Transaction signing — matches Wallet.sign_tx()
// ---------------------------------------------------------------------------

/**
 * Build the tx dict that will be hashed (without "signature").
 * Field order doesn't matter for hashing since we sort keys, but
 * we explicitly omit "signature".
 */
export interface TxFields {
  type_tx: string;
  sender_address: string;
  receiver_address: string;
  amount: number;
  nonce: number;
  payload: Record<string, unknown>;
}

/**
 * Sign a transaction. Returns the DER-encoded signature as hex.
 *
 * Pipeline (mirrors Python):
 *   1. deterministicStringify(txDict)  →  jsonStr
 *   2. SHA256(utf8(jsonStr))            →  txHashHex  (= calculate_hash)
 *   3. SHA256(utf8(txHashHex))          →  32-byte msgDigest
 *      (Python's ECDSA(SHA256) hashes the message before signing)
 *   4. secp256k1.sign(msgDigest, privKey)  →  compact 64-byte sig (r||s)
 *   5. compactToDER(sig)               →  DER bytes (matches Python's output)
 *   6. toHex(DER bytes)                →  signature hex
 *
 * NOTE: @noble/secp256k1 v3 does NOT support format:'der' — it throws.
 * We get compact (r||s) and encode to DER manually.
 */

/** Encode a compact 64-byte ECDSA signature (r||s) into DER format. */
function compactToDER(compact: Uint8Array): Uint8Array {
  function encodeInt(n: Uint8Array): Uint8Array {
    // Strip leading zeros but keep at least 1 byte
    let start = 0;
    while (start < n.length - 1 && n[start] === 0) start++;
    const trimmed = n.slice(start);
    // Prepend 0x00 if high bit set (would be misinterpreted as negative)
    if (trimmed[0] & 0x80) {
      const out = new Uint8Array(trimmed.length + 1);
      out[0] = 0x00;
      out.set(trimmed, 1);
      return out;
    }
    return trimmed;
  }
  const rEnc = encodeInt(compact.slice(0, 32));
  const sEnc = encodeInt(compact.slice(32, 64));
  const totalLen = 2 + rEnc.length + 2 + sEnc.length;
  const der = new Uint8Array(2 + totalLen);
  let i = 0;
  der[i++] = 0x30; // SEQUENCE
  der[i++] = totalLen;
  der[i++] = 0x02; // INTEGER r
  der[i++] = rEnc.length;
  der.set(rEnc, i); i += rEnc.length;
  der[i++] = 0x02; // INTEGER s
  der[i++] = sEnc.length;
  der.set(sEnc, i);
  return der;
}

export async function signTransaction(
  txFields: TxFields,
  privateKeyHex: string
): Promise<string> {
  // Step 1+2: deterministic JSON → SHA256 → txHash (hex string)
  const txHashHex = hashTxDict(txFields as unknown as Record<string, unknown>);

  // Step 3: Python's ECDSA(hashes.SHA256()) hashes the message again
  const msgDigest = sha256(new TextEncoder().encode(txHashHex));

  // Step 4: sign — prehash:false so the library uses msgDigest as-is
  // lowS:false → Python cryptography lib does NOT enforce low-S by default
  const privKeyBytes = fromHex(privateKeyHex);
  const compactSig = await secp.signAsync(msgDigest, privKeyBytes, {
    prehash: false,
    lowS: false,
  });

  // Step 5+6: convert compact (r||s) → DER → hex
  return toHex(compactToDER(compactSig));
}
