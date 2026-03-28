/**
 * グローバルRxNostrインスタンス管理
 * WebSocket接続を一元管理し、複数のコンポーネント間で共有
 */
import { verifier } from '@rx-nostr/crypto'
import { createRxNostr, type RxNostr } from 'rx-nostr'
import { DEFAULT_RELAYS } from '$lib/constants'

let rxNostrInstance: RxNostr | null = null

export function getRxNostr(): RxNostr {
	if (!rxNostrInstance) {
		rxNostrInstance = createRxNostr({ verifier })
	}
	return rxNostrInstance
}

export function connectToDefaultRelays(): void {
	getRxNostr().setDefaultRelays([...DEFAULT_RELAYS])
}

export function cleanupRxNostr(): void {
	if (rxNostrInstance) {
		rxNostrInstance.dispose()
		rxNostrInstance = null
	}
}
