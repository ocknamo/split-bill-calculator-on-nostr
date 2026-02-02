/**
 * Nostrプロフィール取得 (rx-nostr版)
 */
import { nip19 } from 'nostr-tools'
import { createRxBackwardReq, uniq } from 'rx-nostr'
import { DEFAULT_RELAYS } from '@/lib/constants'
import { getRxNostr } from '@/lib/nostr/rx-nostr-client'
import type { NostrProfile } from '@/types/nostr'

export function isValidNpub(npub: string): boolean {
  try {
    const decoded = nip19.decode(npub)
    return decoded.type === 'npub'
  } catch {
    return false
  }
}

export function npubToHex(npub: string): string | null {
  try {
    const decoded = nip19.decode(npub)
    if (decoded.type === 'npub') {
      return decoded.data as string
    }
    return null
  } catch {
    return null
  }
}

const FETCH_TIMEOUT_MS = 10000 // 10 seconds timeout

export async function fetchNostrProfile(npub: string): Promise<NostrProfile | null> {
  const pubkey = npubToHex(npub)
  if (!pubkey) return null

  const rxNostr = getRxNostr()
  const relays = [...DEFAULT_RELAYS]

  return new Promise((resolve) => {
    let resolved = false
    let timeoutId: NodeJS.Timeout | null = null
    let rxSubscription: { unsubscribe: () => void } | null = null

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (rxSubscription) {
        rxSubscription.unsubscribe()
        rxSubscription = null
      }
    }

    const finish = (result: NostrProfile | null) => {
      if (resolved) return
      resolved = true
      cleanup()
      resolve(result)
    }

    // Set timeout
    timeoutId = setTimeout(() => {
      console.warn('Timeout fetching Nostr profile for', npub)
      finish(null)
    }, FETCH_TIMEOUT_MS)

    // Create request
    const rxReq = createRxBackwardReq()

    // Subscribe to profile events
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
          } catch (err) {
            console.error('Failed to parse profile content:', err)
            finish(null)
          }
        },
        complete: () => {
          // If we haven't received any events by EOSE, resolve with null
          if (!resolved) {
            console.warn('No profile found for', npub)
            finish(null)
          }
        },
        error: (err) => {
          console.error('Error fetching profile:', err)
          finish(null)
        },
      })

    // Emit filter
    rxReq.emit({
      kinds: [0],
      authors: [pubkey],
      limit: 1,
    })

    // Mark as complete
    rxReq.over()
  })
}
