/**
 * Wallet storage — AES-GCM encryption via Web Crypto API (zero extra deps)
 *
 * Stored in localStorage["coinami_wallet"] as a JSON blob:
 * {
 *   ciphertext: hex,   // encrypted private key hex
 *   iv: hex,           // 12-byte AES-GCM IV
 *   salt: hex,         // 16-byte PBKDF2 salt
 *   address: string,   // 40-char hex (stored plaintext for display)
 *   publicKeyHex: string // uncompressed X962 pubkey hex (stored plaintext)
 * }
 *
 * Key derivation: PBKDF2-SHA256, 310_000 iterations (OWASP 2023 recommendation)
 * Encryption: AES-GCM 256-bit
 *
 * The raw private key is NEVER persisted — only the encrypted ciphertext.
 */

const STORAGE_KEY = "coinami_wallet";
const PBKDF2_ITERATIONS = 310_000;

// ---------------------------------------------------------------------------
// Internal Web Crypto helpers
// ---------------------------------------------------------------------------

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface StoredWallet {
  address: string;
  publicKeyHex: string;
}

/** Returns true if an encrypted wallet blob exists in localStorage */
export function hasStoredWallet(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(STORAGE_KEY);
}

/** Removes the wallet blob from localStorage */
export function clearWallet(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Read the non-sensitive stored wallet metadata (address + public key).
 * Returns null if no wallet is stored.
 */
export function getStoredWalletMeta(): StoredWallet | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      address: string;
      publicKeyHex: string;
    };
    return { address: parsed.address, publicKeyHex: parsed.publicKeyHex };
  } catch {
    return null;
  }
}

/**
 * Encrypt the private key with the user's password and save to localStorage.
 *
 * @param privateKeyHex - raw hex private key (in memory only, never persisted raw)
 * @param password      - user-provided passphrase
 * @param address       - wallet address (stored in plaintext for UI display)
 * @param publicKeyHex  - uncompressed public key hex (stored in plaintext)
 */
export async function encryptAndStore(
  privateKeyHex: string,
  password: string,
  address: string,
  publicKeyHex: string
): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const enc = new TextEncoder();
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(privateKeyHex)
  );

  const blob = JSON.stringify({
    ciphertext: toHex(new Uint8Array(ciphertextBuf)),
    iv: toHex(iv),
    salt: toHex(salt),
    address,
    publicKeyHex,
  });

  localStorage.setItem(STORAGE_KEY, blob);
}

/**
 * Decrypt the stored private key with the user's password.
 *
 * @returns the raw private key as a hex string
 * @throws if decryption fails (wrong password or corrupted storage)
 */
export async function decryptFromStorage(password: string): Promise<string> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error("No wallet found in storage");

  const { ciphertext, iv, salt } = JSON.parse(raw) as {
    ciphertext: string;
    iv: string;
    salt: string;
  };

  const key = await deriveKey(password, fromHex(salt));

  let plainBuf: ArrayBuffer;
  try {
    const ivBytes = fromHex(iv);
    const ciphertextBytes = fromHex(ciphertext);
    plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes.buffer.slice(ivBytes.byteOffset, ivBytes.byteOffset + ivBytes.byteLength) as ArrayBuffer },
      key,
      ciphertextBytes.buffer.slice(ciphertextBytes.byteOffset, ciphertextBytes.byteOffset + ciphertextBytes.byteLength) as ArrayBuffer
    );
  } catch {
    throw new Error("Invalid password or corrupted wallet data");
  }

  return new TextDecoder().decode(plainBuf);
}
