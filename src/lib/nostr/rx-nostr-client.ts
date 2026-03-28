/**
 * グローバルRxNostrインスタンス管理
 */
import { verifier } from '@rx-nostr/crypto'
import { createRxNostr, type RxNostr } from 'rx-nostr'
import { browser } from '$app/environment'
import { DEFAULT_RELAYS } from '$lib/constants'

let rxNostrInstance: RxNostr | null = null

export function getRxNostr(): RxNostr {
  if (!browser) throw new Error('getRxNostr: must be called in browser context')
  if (!rxNostrInstance) {
    rxNostrInstance = createRxNostr({ verifier })
  }
  return rxNostrInstance
}

export function connectToDefaultRelays(): void {
  const rxNostr = getRxNostr()
  rxNostr.setDefaultRelays([...DEFAULT_RELAYS])
}

export function cleanupRxNostr(): void {
  if (rxNostrInstance) {
    rxNostrInstance.dispose()
    rxNostrInstance = null
  }
}
