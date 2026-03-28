/**
 * Owner秘密鍵の永続化
 * LocalStorageを使用してSettlement Owner秘密鍵を管理
 */

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

const OWNER_KEYS_STORAGE_KEY = "warikan-owner-keys";

interface OwnerKeyStore {
  [settlementId: string]: {
    secretKey: string; // hex encoded
    pubkey: string;
    createdAt: number;
  };
}

export function saveOwnerKey(settlementId: string, sk: Uint8Array, pubkey: string): void {
  try {
    const stored = localStorage.getItem(OWNER_KEYS_STORAGE_KEY);
    const store: OwnerKeyStore = stored ? JSON.parse(stored) : {};
    store[settlementId] = { secretKey: bytesToHex(sk), pubkey, createdAt: Date.now() };
    localStorage.setItem(OWNER_KEYS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function loadOwnerKey(settlementId: string): { sk: Uint8Array; pubkey: string } | null {
  try {
    const stored = localStorage.getItem(OWNER_KEYS_STORAGE_KEY);
    if (!stored) return null;
    const store: OwnerKeyStore = JSON.parse(stored);
    const entry = store[settlementId];
    if (!entry) return null;
    return { sk: hexToBytes(entry.secretKey), pubkey: entry.pubkey };
  } catch {
    return null;
  }
}

export function hasOwnerKey(settlementId: string): boolean {
  return loadOwnerKey(settlementId) !== null;
}

export function clearOwnerKey(settlementId: string): void {
  try {
    const stored = localStorage.getItem(OWNER_KEYS_STORAGE_KEY);
    if (!stored) return;
    const store: OwnerKeyStore = JSON.parse(stored);
    delete store[settlementId];
    localStorage.setItem(OWNER_KEYS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function cleanupOldOwnerKeys(): void {
  try {
    const stored = localStorage.getItem(OWNER_KEYS_STORAGE_KEY);
    if (!stored) return;
    const store: OwnerKeyStore = JSON.parse(stored);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let cleaned = false;
    for (const [id, entry] of Object.entries(store)) {
      if (now - entry.createdAt > thirtyDays) {
        delete store[id];
        cleaned = true;
      }
    }
    if (cleaned) localStorage.setItem(OWNER_KEYS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}
