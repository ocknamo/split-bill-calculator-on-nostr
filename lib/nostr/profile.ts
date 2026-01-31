import { nip19, SimplePool } from "nostr-tools"
import { DEFAULT_RELAYS } from "@/lib/constants"
import type { NostrProfile } from "@/types/nostr"

export function isValidNpub(npub: string): boolean {
  try {
    const decoded = nip19.decode(npub)
    return decoded.type === "npub"
  } catch {
    return false
  }
}

export function npubToHex(npub: string): string | null {
  try {
    const decoded = nip19.decode(npub)
    if (decoded.type === "npub") {
      return decoded.data as string
    }
    return null
  } catch {
    return null
  }
}

const FETCH_TIMEOUT_MS = 10000 // 10 seconds timeout

export async function fetchNostrProfile(
  npub: string
): Promise<NostrProfile | null> {
  const pubkey = npubToHex(npub)
  if (!pubkey) return null

  const pool = new SimplePool()

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout")), FETCH_TIMEOUT_MS)
    })

    // Race between fetch and timeout
    const event = await Promise.race([
      pool.get([...DEFAULT_RELAYS], {
        kinds: [0],
        authors: [pubkey],
      }),
      timeoutPromise,
    ])

    if (event) {
      const content = JSON.parse(event.content) as NostrProfile
      return {
        name: content.name,
        displayName: content.displayName,
        picture: content.picture,
        lud16: content.lud16,
        nip05: content.nip05,
      }
    }
    return null
  } catch (error) {
    console.error("Failed to fetch Nostr profile:", error)
    return null
  } finally {
    pool.close([...DEFAULT_RELAYS])
  }
}
