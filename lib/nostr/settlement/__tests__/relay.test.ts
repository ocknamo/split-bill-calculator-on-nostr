/**
 * Relay通信層のテスト
 * TDD Red Phase: Relay通信のテストケース
 */

import type { Event } from 'nostr-tools'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EXPENSE_KIND, LOCK_KIND, MEMBER_KIND, SETTLEMENT_KIND } from '../events/types'
import {
  createRelayClient,
  type RelayClient,
  type RelayConfig,
  type SubscriptionOptions,
} from '../relay'

// モックSimplePool
const mockPool = {
  subscribeMany: vi.fn(),
  publish: vi.fn(),
  close: vi.fn(),
}

vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual('nostr-tools')
  return {
    ...actual,
    SimplePool: vi.fn(() => mockPool),
  }
})

describe('RelayClient', () => {
  const defaultConfig: RelayConfig = {
    relays: ['wss://relay1.example.com', 'wss://relay2.example.com'],
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

  describe('createRelayClient', () => {
    it('should create client with config', () => {
      expect(client).toBeDefined()
      expect(client.subscribe).toBeDefined()
      expect(client.publish).toBeDefined()
      expect(client.close).toBeDefined()
    })
  })

  describe('subscribe', () => {
    it('should subscribe to settlement events with correct filter', () => {
      const settlementId = 'test-settlement-id'
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

      const calls = mockPool.subscribeMany.mock.calls[0]
      expect(calls[0]).toEqual(defaultConfig.relays)
      expect(calls[1]).toEqual({
        kinds: [SETTLEMENT_KIND, MEMBER_KIND, EXPENSE_KIND, LOCK_KIND],
        '#d': [settlementId],
      })
      expect(calls[2]).toHaveProperty('onevent')
      expect(calls[2]).toHaveProperty('oneose')
      expect(typeof calls[2].onevent).toBe('function')
      expect(typeof calls[2].oneose).toBe('function')

      expect(sub).toBeDefined()
      expect(sub.close).toBeDefined()
    })

    it('should filter by specific kinds when provided', () => {
      const settlementId = 'test-settlement-id'
      const mockSubCloser = { close: vi.fn() }
      mockPool.subscribeMany.mockReturnValue(mockSubCloser)

      client.subscribe({
        settlementId,
        kinds: [EXPENSE_KIND],
        onEvent: vi.fn(),
      })

      expect(mockPool.subscribeMany).toHaveBeenCalledWith(
        defaultConfig.relays,
        {
          kinds: [EXPENSE_KIND],
          '#d': [settlementId],
        },
        expect.any(Object),
      )
    })

    it('should call onEvent when event received', () => {
      const onEvent = vi.fn()
      const mockSubCloser = { close: vi.fn() }
      mockPool.subscribeMany.mockReturnValue(mockSubCloser)

      client.subscribe({
        settlementId: 'test-id',
        onEvent,
      })

      // subscribeManyに渡されたコールバックを取得
      const subscribeCall = mockPool.subscribeMany.mock.calls[0]
      const callbacks = subscribeCall[2]

      // モックイベントを送信
      const mockEvent: Event = {
        id: 'event-id',
        pubkey: 'pubkey',
        created_at: Math.floor(Date.now() / 1000),
        kind: EXPENSE_KIND,
        tags: [['d', 'test-id']],
        content: '{}',
        sig: 'sig',
      }

      callbacks.onevent(mockEvent)

      expect(onEvent).toHaveBeenCalledWith(mockEvent)
    })

    it('should call onEose when end of stored events', () => {
      const onEose = vi.fn()
      const mockSubCloser = { close: vi.fn() }
      mockPool.subscribeMany.mockReturnValue(mockSubCloser)

      client.subscribe({
        settlementId: 'test-id',
        onEvent: vi.fn(),
        onEose,
      })

      const subscribeCall = mockPool.subscribeMany.mock.calls[0]
      const callbacks = subscribeCall[2]

      callbacks.oneose()

      expect(onEose).toHaveBeenCalled()
    })
  })

  describe('publish', () => {
    it('should publish event to all relays', async () => {
      const event: Event = {
        id: 'event-id',
        pubkey: 'pubkey',
        created_at: Math.floor(Date.now() / 1000),
        kind: EXPENSE_KIND,
        tags: [['d', 'test-id']],
        content: '{}',
        sig: 'sig',
      }

      mockPool.publish.mockResolvedValue(undefined)

      await client.publish(event)

      expect(mockPool.publish).toHaveBeenCalledWith(defaultConfig.relays, event)
    })

    it('should throw on publish failure', async () => {
      const event: Event = {
        id: 'event-id',
        pubkey: 'pubkey',
        created_at: Math.floor(Date.now() / 1000),
        kind: EXPENSE_KIND,
        tags: [],
        content: '{}',
        sig: 'sig',
      }

      mockPool.publish.mockRejectedValue(new Error('Publish failed'))

      await expect(client.publish(event)).rejects.toThrow('Publish failed')
    })
  })

  describe('close', () => {
    it('should close pool connection', () => {
      client.close()

      expect(mockPool.close).toHaveBeenCalledWith(defaultConfig.relays)
    })
  })
})

describe('fetchSettlementEvents', () => {
  it('should fetch all events for a settlement', async () => {
    const { fetchSettlementEvents } = await import('../relay')

    const mockEvents: Event[] = [
      {
        id: 'event-1',
        pubkey: 'pubkey',
        created_at: 1000,
        kind: SETTLEMENT_KIND,
        tags: [['d', 'settlement-id']],
        content: '{}',
        sig: 'sig',
      },
      {
        id: 'event-2',
        pubkey: 'pubkey',
        created_at: 1001,
        kind: MEMBER_KIND,
        tags: [['d', 'settlement-id']],
        content: '{}',
        sig: 'sig',
      },
    ]

    const mockSubCloser = {
      close: vi.fn(),
    }

    mockPool.subscribeMany.mockImplementation((_relays, _filters, callbacks) => {
      // 非同期でイベントを送信
      setTimeout(() => {
        for (const event of mockEvents) {
          callbacks.onevent(event)
        }
        callbacks.oneose()
      }, 10)
      return mockSubCloser
    })

    const config: RelayConfig = {
      relays: ['wss://relay.example.com'],
      timeout: 5000,
    }

    const events = await fetchSettlementEvents(config, 'settlement-id')

    expect(events).toHaveLength(2)
    expect(events).toEqual(mockEvents)
    expect(mockSubCloser.close).toHaveBeenCalled()
  })
})
