import { describe, expect, it } from 'vitest'
import { generateSettlementId, isValidSettlementId } from './id'

describe('generateSettlementId', () => {
  it('should generate a valid UUID v4 format string', () => {
    const id = generateSettlementId()
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(id).toMatch(uuidV4Regex)
  })

  it('should generate unique IDs on each call', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateSettlementId())
    }
    expect(ids.size).toBe(100)
  })

  it('should generate 128-bit entropy (36 chars with hyphens)', () => {
    const id = generateSettlementId()
    expect(id.length).toBe(36)
  })
})

describe('isValidSettlementId', () => {
  it('should return true for valid UUID v4', () => {
    expect(isValidSettlementId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('should return false for human-readable strings', () => {
    expect(isValidSettlementId('okinawa-trip-2024')).toBe(false)
    expect(isValidSettlementId('my-settlement')).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(isValidSettlementId('')).toBe(false)
  })

  it('should return false for invalid UUID format', () => {
    expect(isValidSettlementId('not-a-uuid')).toBe(false)
    expect(isValidSettlementId('550e8400-e29b-41d4-a716')).toBe(false)
  })

  it('should return false for UUID v1 (version check)', () => {
    expect(isValidSettlementId('550e8400-e29b-11d4-a716-446655440000')).toBe(false)
  })
})
