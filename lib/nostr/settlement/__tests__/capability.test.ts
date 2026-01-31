import { describe, it, expect } from "vitest"
import {
  generateInviteToken,
  calculateInviteHash,
  calculateCap,
  verifyCap,
} from "../capability"

describe("generateInviteToken", () => {
  it("should generate a 32-byte (64 hex chars) random token", () => {
    const token = generateInviteToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it("should generate unique tokens on each call", () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 100; i++) {
      tokens.add(generateInviteToken())
    }
    expect(tokens.size).toBe(100)
  })
})

describe("calculateInviteHash", () => {
  it("should return SHA-256 hash of the token (64 hex chars)", () => {
    const token = "a".repeat(64)
    const hash = calculateInviteHash(token)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("should be deterministic for same input", () => {
    const token = generateInviteToken()
    const hash1 = calculateInviteHash(token)
    const hash2 = calculateInviteHash(token)
    expect(hash1).toBe(hash2)
  })

  it("should produce different hashes for different tokens", () => {
    const token1 = generateInviteToken()
    const token2 = generateInviteToken()
    const hash1 = calculateInviteHash(token1)
    const hash2 = calculateInviteHash(token2)
    expect(hash1).not.toBe(hash2)
  })
})

describe("calculateCap", () => {
  it("should return H(invite_token || pubkey) as 64 hex chars", () => {
    const inviteToken = "a".repeat(64)
    const pubkey = "b".repeat(64)
    const cap = calculateCap(inviteToken, pubkey)
    expect(cap).toHaveLength(64)
    expect(cap).toMatch(/^[0-9a-f]{64}$/)
  })

  it("should be deterministic for same inputs", () => {
    const inviteToken = generateInviteToken()
    const pubkey = "npub1abc123def456"
    const cap1 = calculateCap(inviteToken, pubkey)
    const cap2 = calculateCap(inviteToken, pubkey)
    expect(cap1).toBe(cap2)
  })

  it("should produce different caps for different pubkeys with same token", () => {
    const inviteToken = generateInviteToken()
    const pubkey1 = "pubkey1"
    const pubkey2 = "pubkey2"
    const cap1 = calculateCap(inviteToken, pubkey1)
    const cap2 = calculateCap(inviteToken, pubkey2)
    expect(cap1).not.toBe(cap2)
  })

  it("should produce different caps for different tokens with same pubkey", () => {
    const token1 = generateInviteToken()
    const token2 = generateInviteToken()
    const pubkey = "pubkey1"
    const cap1 = calculateCap(token1, pubkey)
    const cap2 = calculateCap(token2, pubkey)
    expect(cap1).not.toBe(cap2)
  })
})

describe("verifyCap", () => {
  it("should return true for valid cap", () => {
    const inviteToken = generateInviteToken()
    const pubkey = "npub1abc123def456"
    const cap = calculateCap(inviteToken, pubkey)
    expect(verifyCap(cap, inviteToken, pubkey)).toBe(true)
  })

  it("should return false for invalid cap", () => {
    const inviteToken = generateInviteToken()
    const pubkey = "npub1abc123def456"
    const invalidCap = "0".repeat(64)
    expect(verifyCap(invalidCap, inviteToken, pubkey)).toBe(false)
  })

  it("should return false for wrong pubkey", () => {
    const inviteToken = generateInviteToken()
    const pubkey1 = "npub1abc123def456"
    const pubkey2 = "npub1xyz789ghi012"
    const cap = calculateCap(inviteToken, pubkey1)
    expect(verifyCap(cap, inviteToken, pubkey2)).toBe(false)
  })

  it("should return false for wrong token", () => {
    const token1 = generateInviteToken()
    const token2 = generateInviteToken()
    const pubkey = "npub1abc123def456"
    const cap = calculateCap(token1, pubkey)
    expect(verifyCap(cap, token2, pubkey)).toBe(false)
  })
})
