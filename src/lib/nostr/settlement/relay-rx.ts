/**
 * Relay通信層 (rx-nostr版)
 */
import { createRxBackwardReq, uniq } from 'rx-nostr'
import { getRxNostr } from '$lib/nostr/rx-nostr-client'
import { EXPENSE_KIND, LOCK_KIND, MEMBER_KIND, SETTLEMENT_KIND } from './events/types'
import type { NostrEvent } from './events/types'

export interface RelayConfig {
  relays: string[]
  timeout?: number
}

export interface SubscriptionOptions {
  settlementId: string
  kinds?: number[]
  onEvent: (event: NostrEvent) => void
  onEose?: () => void
}

export interface Subscription {
  close: () => void
}

export interface RelayClient {
  subscribe: (options: SubscriptionOptions) => Subscription
  publish: (event: NostrEvent) => Promise<void>
  close: () => void
}

export function createRelayClient(config: RelayConfig): RelayClient {
  const rxNostr = getRxNostr()
  const { relays } = config

  return {
    subscribe(options: SubscriptionOptions): Subscription {
      const { settlementId, kinds, onEvent, onEose } = options
      const filterKinds = kinds ?? [SETTLEMENT_KIND, MEMBER_KIND, EXPENSE_KIND, LOCK_KIND]
      const rxReq = createRxBackwardReq()

      const subscription = rxNostr
        .use(rxReq, { relays })
        .pipe(uniq())
        .subscribe({
          next: (packet) => {
            onEvent(packet.event as NostrEvent)
          },
          complete: () => {
            onEose?.()
          },
        })

      rxReq.emit({ kinds: filterKinds, '#d': [settlementId] })

      return {
        close: () => {
          subscription.unsubscribe()
          rxReq.over()
        },
      }
    },

    async publish(event: NostrEvent): Promise<void> {
      const timeout = config.timeout ?? 10000
      let successCount = 0
      let subscription: { unsubscribe: () => void } | null = null
      let resolved = false

      return new Promise((resolve, reject) => {
        const done = (err?: Error) => {
          if (resolved) return
          resolved = true
          clearTimeout(timeoutId)
          subscription?.unsubscribe()
          if (err) reject(err)
          else resolve()
        }

        const timeoutId = setTimeout(() => {
          if (successCount >= 1) done()
          else done(new Error(`Publish timeout after ${timeout}ms`))
        }, timeout)

        subscription = rxNostr.send(event, { relays }).subscribe({
          next: (packet) => {
            if (packet.ok) {
              successCount++
              if (successCount >= 1) done()
            }
          },
          complete: () => {
            if (successCount >= 1) done()
            else done(new Error('Publish failed: succeeded to 0 relays'))
          },
          error: (err) => {
            done(err)
          },
        })
      })
    },

    close() {
      // rx-nostrはグローバルインスタンスなので個別closeは不要
    },
  }
}

export async function fetchSettlementEvents(
  config: RelayConfig,
  settlementId: string,
): Promise<NostrEvent[]> {
  const rxNostr = getRxNostr()
  const { relays } = config
  const rxReq = createRxBackwardReq()
  const filter = {
    kinds: [SETTLEMENT_KIND, MEMBER_KIND, EXPENSE_KIND, LOCK_KIND],
    '#d': [settlementId],
  }

  return new Promise((resolve, reject) => {
    const events: NostrEvent[] = []
    const timeout = config.timeout ?? 10000

    const timeoutId = setTimeout(() => {
      subscription.unsubscribe()
      rxReq.over()
      resolve(events)
    }, timeout)

    const subscription = rxNostr
      .use(rxReq, { relays })
      .pipe(uniq())
      .subscribe({
        next: (packet) => {
          events.push(packet.event as NostrEvent)
        },
        complete: () => {
          clearTimeout(timeoutId)
          resolve(events)
        },
        error: (err) => {
          clearTimeout(timeoutId)
          reject(err)
        },
      })

    rxReq.emit(filter)
    rxReq.over()
  })
}
