/**
 * Owner秘密鍵の永続化
 * LocalStorageを使用してSettlement Owner秘密鍵を管理
 */

// Utility functions for hex conversion
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

const OWNER_KEYS_STORAGE_KEY = 'warikan-owner-keys'

interface OwnerKeyStore {
  [settlementId: string]: {
    secretKey: string // hex encoded
    pubkey: string
    createdAt: number
  }
}

/**
 * Owner秘密鍵を保存
 */
export function saveOwnerKey(settlementId: string, sk: Uint8Array, pubkey: string): void {
  try {
    const stored = localStorage.getItem(OWNER_KEYS_STORAGE_KEY)
    const store: OwnerKeyStore = stored ? JSON.parse(stored) : {}

    store[settlementId] = {
      secretKey: bytesToHex(sk),
      pubkey,
      createdAt: Date.now(),
    }

    localStorage.setItem(OWNER_KEYS_STORAGE_KEY, JSON.stringify(store))
    console.log('[v0] Owner key saved:', { settlementId, pubkey })
  } catch (error) {
    console.error('[v0] Failed to save owner key:', error)
  }
}

/**
 * Owner秘密鍵を読み込み
 */
export function loadOwnerKey(settlementId: string): { sk: Uint8Array; pubkey: string } | null {
  try {
    const stored = localStorage.getItem(OWNER_KEYS_STORAGE_KEY)
    if (!stored) return null

    const store: OwnerKeyStore = JSON.parse(stored)
    const entry = store[settlementId]

    if (!entry) return null

    return {
      sk: hexToBytes(entry.secretKey),
      pubkey: entry.pubkey,
    }
  } catch (error) {
    console.error('[v0] Failed to load owner key:', error)
    return null
  }
}

/**
 * Owner秘密鍵が存在するかチェック
 */
export function hasOwnerKey(settlementId: string): boolean {
  return loadOwnerKey(settlementId) !== null
}

/**
 * Owner秘密鍵を削除
 */
export function clearOwnerKey(settlementId: string): void {
  try {
    const stored = localStorage.getItem(OWNER_KEYS_STORAGE_KEY)
    if (!stored) return

    const store: OwnerKeyStore = JSON.parse(stored)
    delete store[settlementId]

    localStorage.setItem(OWNER_KEYS_STORAGE_KEY, JSON.stringify(store))
    console.log('[v0] Owner key cleared:', { settlementId })
  } catch (error) {
    console.error('[v0] Failed to clear owner key:', error)
  }
}

/**
 * 古いOwner秘密鍵を自動削除（30日以上経過したもの）
 */
export function cleanupOldOwnerKeys(): void {
  try {
    const stored = localStorage.getItem(OWNER_KEYS_STORAGE_KEY)
    if (!stored) return

    const store: OwnerKeyStore = JSON.parse(stored)
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000

    let cleanedCount = 0
    for (const [settlementId, entry] of Object.entries(store)) {
      if (now - entry.createdAt > thirtyDays) {
        delete store[settlementId]
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      localStorage.setItem(OWNER_KEYS_STORAGE_KEY, JSON.stringify(store))
      console.log('[v0] Cleaned up old owner keys:', { count: cleanedCount })
    }
  } catch (error) {
    console.error('[v0] Failed to cleanup old owner keys:', error)
  }
}

/**
 * すべてのOwner秘密鍵を取得（デバッグ用）
 */
export function getAllOwnerKeys(): OwnerKeyStore {
  try {
    const stored = localStorage.getItem(OWNER_KEYS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('[v0] Failed to get all owner keys:', error)
    return {}
  }
}
