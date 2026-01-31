/**
 * Capability-based access control for settlement
 *
 * Requirements:
 * - invite_token: Secret token for settlement participation
 * - invite_hash: H(invite_token) - published in settlement event
 * - cap: H(invite_token || pubkey) - proves knowledge of invite_token
 */

// Use Web Crypto API for hashing and random bytes
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return new Uint8Array(hashBuffer)
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Generates a new invite token (32 bytes of random data)
 * This token should be kept secret and shared only via invite links
 */
export function generateInviteToken(): string {
  return bytesToHex(randomBytes(32))
}

/**
 * Calculates the invite hash H(invite_token)
 * This hash is published in the settlement event to define the capability boundary
 */
export async function calculateInviteHash(inviteToken: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(inviteToken)
  const hash = await sha256(data)
  return bytesToHex(hash)
}

/**
 * Calculates the capability cap = H(invite_token || pubkey)
 * This proves that the actor knows the invite_token
 */
export async function calculateCap(inviteToken: string, pubkey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(inviteToken + pubkey)
  const hash = await sha256(data)
  return bytesToHex(hash)
}

/**
 * Verifies if a cap is valid for the given invite_token and pubkey
 */
export async function verifyCap(
  cap: string,
  inviteToken: string,
  pubkey: string
): Promise<boolean> {
  const expectedCap = await calculateCap(inviteToken, pubkey)
  return cap === expectedCap
}
