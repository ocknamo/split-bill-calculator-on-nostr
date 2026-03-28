import { nip19, SimplePool } from 'nostr-tools'
import { DEFAULT_RELAYS } from '@/lib/constants'
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

  const pool = new SimplePool()
  const relays = [...DEFAULT_RELAYS]

  return new Promise((resolve) => {
    let resolved = false
    let timeoutId: NodeJS.Timeout | null = null
    let sub: ReturnType<typeof pool.subscribeMany> | null = null

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (sub) {
        sub.close()
        sub = null
      }
      // Close pool after a short delay to allow pending operations to complete
      setTimeout(() => {
        try {
          pool.close(relays)
        } catch (_err) {
          // Ignore errors during close (e.g., WebSocket already closed)
        }
      }, 100)
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

    // Subscribe to profile events
    sub = pool.subscribeMany(
      relays,
      {
        kinds: [0],
        authors: [pubkey],
        limit: 1,
      },
      {
        onevent(event) {
          try {
            const content = JSON.parse(event.content) as NostrProfile
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
        oneose() {
          // If we haven't received any events by EOSE, resolve with null
          if (!resolved) {
            console.warn('No profile found for', npub)
            finish(null)
          }
        },
      },
    )
  })
}
