/**
 * Nostrプロフィール取得 (rx-nostr版)
 * nip19 (nostr-tools) の代わりに @scure/base で bech32 デコード
 */
import { bech32 } from '@scure/base'
import { createRxBackwardReq, uniq } from 'rx-nostr'
import { browser } from '$app/environment'
import { DEFAULT_RELAYS } from '$lib/constants'
import { getRxNostr } from '$lib/nostr/rx-nostr-client'
import type { NostrProfile } from '$lib/types/nostr'

export function npubToHex(npub: string): string | null {
  try {
    const decoded = bech32.decode(npub as `${string}1${string}`)
    if (decoded.prefix !== 'npub') return null
    const bytes = bech32.fromWords(decoded.words)
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}

export function isValidNpub(npub: string): boolean {
  return npubToHex(npub) !== null
}

const FETCH_TIMEOUT_MS = 10000

export async function fetchNostrProfile(npub: string): Promise<NostrProfile | null> {
  if (!browser) return null
  const pubkey = npubToHex(npub)
  if (!pubkey) return null

  const rxNostr = getRxNostr()
  const relays = [...DEFAULT_RELAYS]

  return new Promise((resolve) => {
    let resolved = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let rxSubscription: { unsubscribe: () => void } | null = null

    const finish = (result: NostrProfile | null) => {
      if (resolved) return
      resolved = true
      if (timeoutId) clearTimeout(timeoutId)
      rxSubscription?.unsubscribe()
      resolve(result)
    }

    timeoutId = setTimeout(() => finish(null), FETCH_TIMEOUT_MS)

    const rxReq = createRxBackwardReq()
    rxSubscription = rxNostr
      .use(rxReq, { relays })
      .pipe(uniq())
      .subscribe({
        next: (packet) => {
          try {
            const content = JSON.parse(packet.event.content) as NostrProfile
            finish({
              name: content.name,
              displayName: content.displayName,
              picture: content.picture,
              lud16: content.lud16,
              nip05: content.nip05,
            })
          } catch {
            finish(null)
          }
        },
        complete: () => { if (!resolved) finish(null) },
        error: () => { finish(null) },
      })

    rxReq.emit({ kinds: [0], authors: [pubkey], limit: 1 })
    rxReq.over()
  })
}
