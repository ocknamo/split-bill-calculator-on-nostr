import { describe, expect, it } from 'vitest'
import { calculateCap, calculateInviteHash, generateInviteToken, verifyCap } from './capability'

describe('generateInviteToken', () => {
  it('should generate a 32-byte (64 hex chars) random token', () => {
    const token = generateInviteToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('should generate unique tokens on each call', () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 100; i++) {
      tokens.add(generateInviteToken())
    }
    expect(tokens.size).toBe(100)
  })
})

describe('calculateInviteHash', () => {
  it('should return SHA-256 hash of the token (64 hex chars)', async () => {
    const token = 'a'.repeat(64)
    const hash = await calculateInviteHash(token)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('should be deterministic for same input', async () => {
    const token = generateInviteToken()
    const hash1 = await calculateInviteHash(token)
    const hash2 = await calculateInviteHash(token)
    expect(hash1).toBe(hash2)
  })

  it('should produce different hashes for different tokens', async () => {
    const token1 = generateInviteToken()
    const token2 = generateInviteToken()
    const hash1 = await calculateInviteHash(token1)
    const hash2 = await calculateInviteHash(token2)
    expect(hash1).not.toBe(hash2)
  })
})

describe('calculateCap', () => {
  it('should return H(invite_token || pubkey) as 64 hex chars', async () => {
    const inviteToken = 'a'.repeat(64)
    const pubkey = 'b'.repeat(64)
    const cap = await calculateCap(inviteToken, pubkey)
    expect(cap).toHaveLength(64)
    expect(cap).toMatch(/^[0-9a-f]{64}$/)
  })

  it('should be deterministic for same inputs', async () => {
    const inviteToken = generateInviteToken()
    const pubkey = 'npub1abc123def456'
    const cap1 = await calculateCap(inviteToken, pubkey)
    const cap2 = await calculateCap(inviteToken, pubkey)
    expect(cap1).toBe(cap2)
  })

  it('should produce different caps for different pubkeys with same token', async () => {
    const inviteToken = generateInviteToken()
    const cap1 = await calculateCap(inviteToken, 'pubkey1')
    const cap2 = await calculateCap(inviteToken, 'pubkey2')
    expect(cap1).not.toBe(cap2)
  })

  it('should produce different caps for different tokens with same pubkey', async () => {
    const pubkey = 'pubkey1'
    const cap1 = await calculateCap(generateInviteToken(), pubkey)
    const cap2 = await calculateCap(generateInviteToken(), pubkey)
    expect(cap1).not.toBe(cap2)
  })

  it('[C2] should not collide when concatenation is ambiguous without separator', async () => {
    // Without '\0': H("ab" + "c") === H("a" + "bc") — collision!
    // With '\0':    H("ab\0c")    !== H("a\0bc")    — correct
    const cap1 = await calculateCap('ab', 'c')
    const cap2 = await calculateCap('a', 'bc')
    expect(cap1).not.toBe(cap2)
  })
})

describe('verifyCap', () => {
  it('should return true for valid cap', async () => {
    const inviteToken = generateInviteToken()
    const pubkey = 'npub1abc123def456'
    const cap = await calculateCap(inviteToken, pubkey)
    expect(await verifyCap(cap, inviteToken, pubkey)).toBe(true)
  })

  it('should return false for invalid cap', async () => {
    const inviteToken = generateInviteToken()
    const pubkey = 'npub1abc123def456'
    expect(await verifyCap('0'.repeat(64), inviteToken, pubkey)).toBe(false)
  })

  it('should return false for wrong pubkey', async () => {
    const inviteToken = generateInviteToken()
    const cap = await calculateCap(inviteToken, 'npub1abc123def456')
    expect(await verifyCap(cap, inviteToken, 'npub1xyz789ghi012')).toBe(false)
  })

  it('should return false for wrong token', async () => {
    const pubkey = 'npub1abc123def456'
    const cap = await calculateCap(generateInviteToken(), pubkey)
    expect(await verifyCap(cap, generateInviteToken(), pubkey)).toBe(false)
  })
})
