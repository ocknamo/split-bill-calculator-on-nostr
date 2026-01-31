/**
 * Relay通信層のテスト
 * TDD Red Phase: Relay通信のテストケース
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { Event } from "nostr-tools"
import {
  createRelayClient,
  type RelayClient,
  type RelayConfig,
  type SubscriptionOptions,
} from "../relay"
import { SETTLEMENT_EVENT_KINDS } from "../events/types"

// モックSimplePool
const mockPool = {
  subscribeMany: vi.fn(),
  publish: vi.fn(),
  close: vi.fn(),
}

vi.mock("nostr-tools", async () => {
  const actual = await vi.importActual("nostr-tools")
  return {
    ...actual,
    SimplePool: vi.fn(() => mockPool),
  }
})

describe("RelayClient", () => {
  const defaultConfig: RelayConfig = {
    relays: ["wss://relay1.example.com", "wss://relay2.example.com"],
    timeout: 5000,
  }

  let client: RelayClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = createRelayClient(defaultConfig)
  })

  afterEach(() => {
    client.close()
  })

  describe("createRelayClient", () => {
    it("should create client with config", () => {
      expect(client).toBeDefined()
      expect(client.subscribe).toBeDefined()
      expect(client.publish).toBeDefined()
      expect(client.close).toBeDefined()
    })
  })

  describe("subscribe", () => {
    it("should subscribe to settlement events with correct filter", () => {
      const settlementId = "test-settlement-id"
      const onEvent = vi.fn()
      const onEose = vi.fn()

      const options: SubscriptionOptions = {
        settlementId,
        onEvent,
        onEose,
      }

      // モックのsubscribeManyがSubCloserを返すように設定
      const mockSubCloser = { close: vi.fn() }
      mockPool.subscribeMany.mockReturnValue(mockSubCloser)

      const sub = client.subscribe(options)

      expect(mockPool.subscribeMany).toHaveBeenCalledWith(
        defaultConfig.relays,
        [
          {
            kinds: [
              SETTLEMENT_EVENT_KINDS.SETTLEMENT,
              SETTLEMENT_EVENT_KINDS.MEMBER,
              SETTLEMENT_EVENT_KINDS.EXPENSE,
              SETTLEMENT_EVENT_KINDS.LOCK,
            ],
            "#d": [settlementId],
          },
        ],
        expect.objectContaining({
          onevent: expect.any(Function),
          oneose: expect.any(Function),
        })
      )

      expect(sub).toBeDefined()
      expect(sub.close).toBeDefined()
    })

    it("should filter by specific kinds when provided", () => {
      const settlementId = "test-settlement-id"
      const mockSubCloser = { close: vi.fn() }
      mockPool.subscribeMany.mockReturnValue(mockSubCloser)

      client.subscribe({
        settlementId,
        kinds: [SETTLEMENT_EVENT_KINDS.EXPENSE],
        onEvent: vi.fn(),
      })

      expect(mockPool.subscribeMany).toHaveBeenCalledWith(
        defaultConfig.relays,
        [
          {
            kinds: [SETTLEMENT_EVENT_KINDS.EXPENSE],
            "#d": [settlementId],
          },
        ],
        expect.any(Object)
      )
    })

    it("should call onEvent when event received", () => {
      const onEvent = vi.fn()
      const mockSubCloser = { close: vi.fn() }
      mockPool.subscribeMany.mockReturnValue(mockSubCloser)

      client.subscribe({
        settlementId: "test-id",
        onEvent,
      })

      // subscribeManyに渡されたコールバックを取得
      const subscribeCall = mockPool.subscribeMany.mock.calls[0]
      const callbacks = subscribeCall[2]

      // モックイベントを送信
      const mockEvent: Event = {
        id: "event-id",
        pubkey: "pubkey",
        created_at: Math.floor(Date.now() / 1000),
        kind: SETTLEMENT_EVENT_KINDS.EXPENSE,
        tags: [["d", "test-id"]],
        content: "{}",
        sig: "sig",
      }

      callbacks.onevent(mockEvent)

      expect(onEvent).toHaveBeenCalledWith(mockEvent)
    })

    it("should call onEose when end of stored events", () => {
      const onEose = vi.fn()
      const mockSubCloser = { close: vi.fn() }
      mockPool.subscribeMany.mockReturnValue(mockSubCloser)

      client.subscribe({
        settlementId: "test-id",
        onEvent: vi.fn(),
        onEose,
      })

      const subscribeCall = mockPool.subscribeMany.mock.calls[0]
      const callbacks = subscribeCall[2]

      callbacks.oneose()

      expect(onEose).toHaveBeenCalled()
    })
  })

  describe("publish", () => {
    it("should publish event to all relays", async () => {
      const event: Event = {
        id: "event-id",
        pubkey: "pubkey",
        created_at: Math.floor(Date.now() / 1000),
        kind: SETTLEMENT_EVENT_KINDS.EXPENSE,
        tags: [["d", "test-id"]],
        content: "{}",
        sig: "sig",
      }

      mockPool.publish.mockResolvedValue(undefined)

      await client.publish(event)

      expect(mockPool.publish).toHaveBeenCalledWith(defaultConfig.relays, event)
    })

    it("should throw on publish failure", async () => {
      const event: Event = {
        id: "event-id",
        pubkey: "pubkey",
        created_at: Math.floor(Date.now() / 1000),
        kind: SETTLEMENT_EVENT_KINDS.EXPENSE,
        tags: [],
        content: "{}",
        sig: "sig",
      }

      mockPool.publish.mockRejectedValue(new Error("Publish failed"))

      await expect(client.publish(event)).rejects.toThrow("Publish failed")
    })
  })

  describe("close", () => {
    it("should close pool connection", () => {
      client.close()

      expect(mockPool.close).toHaveBeenCalledWith(defaultConfig.relays)
    })
  })
})

describe("fetchSettlementEvents", () => {
  it("should fetch all events for a settlement", async () => {
    const { fetchSettlementEvents } = await import("../relay")

    const mockEvents: Event[] = [
      {
        id: "event-1",
        pubkey: "pubkey",
        created_at: 1000,
        kind: SETTLEMENT_EVENT_KINDS.SETTLEMENT,
        tags: [["d", "settlement-id"]],
        content: "{}",
        sig: "sig",
      },
      {
        id: "event-2",
        pubkey: "pubkey",
        created_at: 1001,
        kind: SETTLEMENT_EVENT_KINDS.MEMBER,
        tags: [["d", "settlement-id"]],
        content: "{}",
        sig: "sig",
      },
    ]

    const mockSubCloser = {
      close: vi.fn(),
    }

    mockPool.subscribeMany.mockImplementation((relays, filters, callbacks) => {
      // 非同期でイベントを送信
      setTimeout(() => {
        mockEvents.forEach((event) => callbacks.onevent(event))
        callbacks.oneose()
      }, 10)
      return mockSubCloser
    })

    const config: RelayConfig = {
      relays: ["wss://relay.example.com"],
      timeout: 5000,
    }

    const events = await fetchSettlementEvents(config, "settlement-id")

    expect(events).toHaveLength(2)
    expect(events).toEqual(mockEvents)
    expect(mockSubCloser.close).toHaveBeenCalled()
  })
})
