/**
 * グローバルRxNostrインスタンス管理
 * WebSocket接続を一元管理し、複数のコンポーネント間で共有
 */
import { verifier } from '@rx-nostr/crypto'
import { createRxNostr, type RxNostr } from 'rx-nostr'
import { DEFAULT_RELAYS } from '@/lib/constants'

let rxNostrInstance: RxNostr | null = null

/**
 * グローバルRxNostrインスタンスを取得
 * 初回呼び出し時にインスタンスを作成し、以降は同じインスタンスを返す
 */
export function getRxNostr(): RxNostr {
  if (!rxNostrInstance) {
    console.log('[v0] Creating new RxNostr instance')
    rxNostrInstance = createRxNostr({
      verifier,
    })
  }
  return rxNostrInstance
}

/**
 * デフォルトRelayに接続
 */
export function connectToDefaultRelays(): void {
  const rxNostr = getRxNostr()
  rxNostr.setDefaultRelays([...DEFAULT_RELAYS])
  console.log('[v0] Connected to default relays:', DEFAULT_RELAYS)
}

/**
 * RxNostrインスタンスをクリーンアップ（テスト用）
 */
export function cleanupRxNostr(): void {
  if (rxNostrInstance) {
    console.log('[v0] Cleaning up RxNostr instance')
    rxNostrInstance.dispose()
    rxNostrInstance = null
  }
}
