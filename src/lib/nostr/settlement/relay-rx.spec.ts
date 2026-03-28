import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock rx-nostr before importing relay-rx
vi.mock('rx-nostr', () => {
  const mockSubscription = { unsubscribe: vi.fn() }
  const mockRxReq = {
    emit: vi.fn(),
    over: vi.fn(),
  }
  const mockRxNostr = {
    use: vi.fn(() => ({
      pipe: vi.fn(() => ({
        subscribe: vi.fn(() => mockSubscription),
      })),
    })),
    send: vi.fn(() => ({
      subscribe: vi.fn((handlers: { next?: (p: unknown) => void; complete?: () => void }) => {
        // Simulate immediate success
        handlers.next?.({ ok: true, from: 'wss://relay.test' })
        handlers.complete?.()
        return mockSubscription
      }),
    })),
    setDefaultRelays: vi.fn(),
    dispose: vi.fn(),
  }
  return {
    createRxNostr: vi.fn(() => mockRxNostr),
    createRxBackwardReq: vi.fn(() => mockRxReq),
    uniq: vi.fn(() => (x: unknown) => x),
  }
})

vi.mock('$app/environment', () => ({ browser: true }))
vi.mock('@rx-nostr/crypto', () => ({ verifier: 'mock-verifier' }))

import { createRelayClient, fetchSettlementEvents } from './relay-rx'
import type { NostrEvent } from './events/types'

const testConfig = { relays: ['wss://relay.test'], timeout: 1000 }

describe('createRelayClient', () => {
  it('should create a relay client with subscribe, publish, close methods', () => {
    const client = createRelayClient(testConfig)
    expect(typeof client.subscribe).toBe('function')
    expect(typeof client.publish).toBe('function')
    expect(typeof client.close).toBe('function')
  })

  it('publish should resolve when at least one relay accepts', async () => {
    const client = createRelayClient(testConfig)
    const mockEvent: NostrEvent = {
      id: 'test-id',
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1052,
      tags: [],
      content: '{}',
      sig: 'test-sig',
    }
    await expect(client.publish(mockEvent)).resolves.toBeUndefined()
  })
})

describe('fetchSettlementEvents', () => {
  it('should return an array (possibly empty) of events', async () => {
    const events = await fetchSettlementEvents(testConfig, 'settlement-123')
    expect(Array.isArray(events)).toBe(true)
  })
})
