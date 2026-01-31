/**
 * Settlement ID generation and validation
 *
 * Requirements:
 * - settlement_id must be sufficiently random (UUID v4 or equivalent)
 * - 128 bits or more entropy
 * - Human-readable strings are NOT allowed
 */

import { bytesToHex, randomBytes } from "@noble/hashes/utils"

/**
 * Generates a new settlement ID using UUID v4 format
 * UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hex digit and y is one of 8, 9, a, or b
 */
export function generateSettlementId(): string {
  const bytes = randomBytes(16)

  // Set version to 4 (UUID v4)
  bytes[6] = (bytes[6] & 0x0f) | 0x40

  // Set variant to RFC 4122
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = bytesToHex(bytes)

  // Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-")
}

/**
 * Validates if a string is a valid settlement ID (UUID v4 format)
 * Rejects human-readable strings and non-UUID formats
 */
export function isValidSettlementId(id: string): boolean {
  if (!id || typeof id !== "string") {
    return false
  }

  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // Version must be 4, variant must be 8, 9, a, or b
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  return uuidV4Regex.test(id)
}
