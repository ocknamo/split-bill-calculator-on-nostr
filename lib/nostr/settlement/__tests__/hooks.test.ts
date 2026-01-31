/**
 * React Hooksのテスト
 * TDD Red Phase: Settlement同期フックのテストケース
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import {
  useSettlementSync,
  useInviteLink,
  parseInviteLink,
  generateInviteLink,
} from "../hooks"
import type { SettlementState } from "../state"

// モック
vi.mock("../relay", () => ({
  createRelayClient: vi.fn(() => ({
    subscribe: vi.fn(() => ({ close: vi.fn() })),
    publish: vi.fn(),
    close: vi.fn(),
  })),
  fetchSettlementEvents: vi.fn(() => Promise.resolve([])),
  DEFAULT_RELAYS: ["wss://relay.example.com"],
}))

vi.mock("nostr-tools", async () => {
  const actual = await vi.importActual("nostr-tools")
  return {
    ...actual,
    generateSecretKey: () => new Uint8Array(32).fill(1),
    getPublicKey: () => "mock-pubkey",
    finalizeEvent: (template: any, sk: Uint8Array) => ({
      ...template,
      id: "mock-event-id",
      pubkey: "mock-pubkey",
      sig: "mock-sig",
    }),
  }
})

describe("parseInviteLink", () => {
  it("should parse valid invite link with settlement_id and invite_token", () => {
    const url = "https://example.com/join?s=settlement-123&t=token-abc"

    const result = parseInviteLink(url)

    expect(result).toEqual({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    })
  })

  it("should return null for invalid URL", () => {
    const result = parseInviteLink("not-a-url")

    expect(result).toBeNull()
  })

  it("should return null if settlement_id is missing", () => {
    const url = "https://example.com/join?t=token-abc"

    const result = parseInviteLink(url)

    expect(result).toBeNull()
  })

  it("should return null if invite_token is missing", () => {
    const url = "https://example.com/join?s=settlement-123"

    const result = parseInviteLink(url)

    expect(result).toBeNull()
  })

  it("should handle URL with additional parameters", () => {
    const url = "https://example.com/join?s=settlement-123&t=token-abc&extra=value"

    const result = parseInviteLink(url)

    expect(result).toEqual({
      settlementId: "settlement-123",
      inviteToken: "token-abc",
    })
  })
})

describe("generateInviteLink", () => {
  it("should generate invite link with settlement_id and invite_token", () => {
    const baseUrl = "https://example.com/join"
    const settlementId = "settlement-123"
    const inviteToken = "token-abc"

    const result = generateInviteLink(settlementId, inviteToken, baseUrl)

    expect(result).toBe("https://example.com/join?s=settlement-123&t=token-abc")
  })

  it("should URL encode special characters", () => {
    const baseUrl = "https://example.com/join"
    const settlementId = "settlement/123"
    const inviteToken = "token+abc"

    const result = generateInviteLink(settlementId, inviteToken, baseUrl)

    expect(result).toContain("settlement%2F123")
    expect(result).toContain("token%2Babc")
  })
})

describe("useInviteLink", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should generate invite link for settlement", () => {
    const { result } = renderHook(() =>
      useInviteLink({
        settlementId: "settlement-123",
        inviteToken: "token-abc",
        baseUrl: "https://example.com/join",
      })
    )

    expect(result.current.inviteLink).toBe(
      "https://example.com/join?s=settlement-123&t=token-abc"
    )
  })

  it("should copy link to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText },
    })

    const { result } = renderHook(() =>
      useInviteLink({
        settlementId: "settlement-123",
        inviteToken: "token-abc",
        baseUrl: "https://example.com/join",
      })
    )

    await act(async () => {
      await result.current.copyToClipboard()
    })

    expect(writeText).toHaveBeenCalledWith(
      "https://example.com/join?s=settlement-123&t=token-abc"
    )
    expect(result.current.copied).toBe(true)
  })

  it("should reset copied state after timeout", async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText },
    })

    const { result } = renderHook(() =>
      useInviteLink({
        settlementId: "settlement-123",
        inviteToken: "token-abc",
        baseUrl: "https://example.com/join",
      })
    )

    await act(async () => {
      await result.current.copyToClipboard()
    })

    expect(result.current.copied).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.copied).toBe(false)

    vi.useRealTimers()
  })
})

describe("useSettlementSync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should initialize with loading state", () => {
    const { result } = renderHook(() =>
      useSettlementSync({
        settlementId: "settlement-123",
        inviteToken: "token-abc",
      })
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.state).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("should provide addExpense function", () => {
    const { result } = renderHook(() =>
      useSettlementSync({
        settlementId: "settlement-123",
        inviteToken: "token-abc",
      })
    )

    expect(result.current.addExpense).toBeDefined()
    expect(typeof result.current.addExpense).toBe("function")
  })

  it("should provide addMember function", () => {
    const { result } = renderHook(() =>
      useSettlementSync({
        settlementId: "settlement-123",
        inviteToken: "token-abc",
      })
    )

    expect(result.current.addMember).toBeDefined()
    expect(typeof result.current.addMember).toBe("function")
  })

  it("should provide lockSettlement function", () => {
    const { result } = renderHook(() =>
      useSettlementSync({
        settlementId: "settlement-123",
        inviteToken: "token-abc",
      })
    )

    expect(result.current.lockSettlement).toBeDefined()
    expect(typeof result.current.lockSettlement).toBe("function")
  })

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() =>
      useSettlementSync({
        settlementId: "settlement-123",
        inviteToken: "token-abc",
      })
    )

    // アンマウント時にエラーが発生しないことを確認
    expect(() => unmount()).not.toThrow()
  })
})
