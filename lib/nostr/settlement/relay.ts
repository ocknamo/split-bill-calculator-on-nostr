/**
 * Relay通信層
 * NostrリレーとのEvent送受信を管理
 */
import { type Event, type Filter, SimplePool } from 'nostr-tools'
import { EXPENSE_KIND, LOCK_KIND, MEMBER_KIND, SETTLEMENT_KIND } from './events/types'

/**
 * Relay設定
 */
export interface RelayConfig {
  /** 接続するRelayのURL一覧 */
  relays: string[]
  /** タイムアウト時間（ミリ秒） */
  timeout?: number
}

/**
 * 購読オプション
 */
export interface SubscriptionOptions {
  /** 購読対象のsettlement ID */
  settlementId: string
  /** フィルタするEvent種別（省略時は全種別） */
  kinds?: number[]
  /** Event受信時のコールバック */
  onEvent: (event: Event) => void
  /** 保存済みEvent送信完了時のコールバック */
  onEose?: () => void
}

/**
 * 購読ハンドル
 */
export interface Subscription {
  /** 購読を終了 */
  close: () => void
}

/**
 * Relayクライアント
 */
export interface RelayClient {
  /** Eventを購読 */
  subscribe: (options: SubscriptionOptions) => Subscription
  /** Eventを発行 */
  publish: (event: Event) => Promise<void>
  /** 接続を終了 */
  close: () => void
}

/**
 * Relayクライアントを作成
 */
export function createRelayClient(config: RelayConfig): RelayClient {
  const pool = new SimplePool()
  const { relays } = config

  return {
    subscribe(options: SubscriptionOptions): Subscription {
      const { settlementId, kinds, onEvent, onEose } = options

      const filterKinds = kinds ?? [SETTLEMENT_KIND, MEMBER_KIND, EXPENSE_KIND, LOCK_KIND]

      const filter: Filter = {
        kinds: filterKinds,
        '#d': [settlementId],
      }

      console.log('[v0] Subscribing with filter:', JSON.stringify(filter))

      const subCloser = pool.subscribeMany(relays, filter, {
        onevent(event: Event) {
          console.log('[v0] Received event:', event.id, event.kind)
          onEvent(event)
        },
        oneose() {
          console.log('[v0] EOSE received')
          onEose?.()
        },
      })

      return {
        close: () => subCloser.close(),
      }
    },

    async publish(event: Event): Promise<void> {
      console.log('[v0] Publishing event:', { id: event.id, kind: event.kind, relays })

      // pool.publish returns a Promise that resolves when published to all relays
      const timeout = config.timeout ?? 10000

      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Publish timeout after ${timeout}ms`)), timeout)
        )

        // Race between publish and timeout
        await Promise.race([pool.publish(relays, event), timeoutPromise])

        console.log('[v0] Publish succeeded')
      } catch (err) {
        console.error('[v0] Publish failed:', err)
        throw err
      }
    },

    close() {
      pool.close(relays)
    },
  }
}

/**
 * Settlementの全Eventを取得（一括取得）
 */
export async function fetchSettlementEvents(
  config: RelayConfig,
  settlementId: string
): Promise<Event[]> {
  console.log('[v0] fetchSettlementEvents:', settlementId)
  const pool = new SimplePool()
  const { relays } = config

  const filter: Filter = {
    kinds: [SETTLEMENT_KIND, MEMBER_KIND, EXPENSE_KIND, LOCK_KIND],
    '#d': [settlementId],
  }

  console.log('[v0] Fetching with filter:', JSON.stringify(filter))

  return new Promise((resolve, reject) => {
    const events: Event[] = []
    const timeout = config.timeout ?? 10000

    const timeoutId = setTimeout(() => {
      sub.close()
      // Close pool after a short delay to allow pending operations to complete
      setTimeout(() => pool.close(relays), 100)
      resolve(events)
    }, timeout)

    const sub = pool.subscribeMany(relays, filter, {
      onevent(event: Event) {
        events.push(event)
      },
      oneose() {
        clearTimeout(timeoutId)
        sub.close()
        // Close pool after a short delay to allow pending operations to complete
        setTimeout(() => {
          pool.close(relays)
          console.log('[v0] Fetched', events.length, 'events')
          resolve(events)
        }, 100)
      },
    })
  })
}
