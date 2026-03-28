/**
 * Relay通信層 (rx-nostr版)
 * NostrリレーとのEvent送受信を管理
 */
import type { Event as NostrToolsEvent } from 'nostr-tools'
import { createRxBackwardReq, uniq } from 'rx-nostr'
import { getRxNostr } from '@/lib/nostr/rx-nostr-client'
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
  onEvent: (event: NostrToolsEvent) => void
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
  publish: (event: NostrToolsEvent) => Promise<void>
  /** 接続を終了 */
  close: () => void
}

/**
 * Relayクライアントを作成 (rx-nostr版)
 */
export function createRelayClient(config: RelayConfig): RelayClient {
  const rxNostr = getRxNostr()
  const { relays } = config

  return {
    subscribe(options: SubscriptionOptions): Subscription {
      const { settlementId, kinds, onEvent, onEose } = options

      const filterKinds = kinds ?? [SETTLEMENT_KIND, MEMBER_KIND, EXPENSE_KIND, LOCK_KIND]

      const rxReq = createRxBackwardReq()

      console.log('[v0] Subscribing with filter:', {
        kinds: filterKinds,
        '#d': [settlementId],
      })

      // イベントストリームを購読
      const subscription = rxNostr
        .use(rxReq, { relays })
        .pipe(uniq())
        .subscribe({
          next: (packet) => {
            console.log('[v0] Received event:', packet.event.id, packet.event.kind)
            onEvent(packet.event)
          },
          complete: () => {
            console.log('[v0] EOSE received')
            onEose?.()
          },
        })

      // フィルタを発行
      rxReq.emit({
        kinds: filterKinds,
        '#d': [settlementId],
      })

      return {
        close: () => {
          subscription.unsubscribe()
          rxReq.over()
        },
      }
    },

    async publish(event: NostrToolsEvent): Promise<void> {
      console.log('[v0] Publishing event:', { id: event.id, kind: event.kind, relays })

      const timeout = config.timeout ?? 10000
      let successCount = 0
      const minSuccessCount = 1 // 少なくとも1つのRelayで成功すればOK

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          subscription.unsubscribe()
          if (successCount >= minSuccessCount) {
            console.log('[v0] Publish succeeded to', successCount, 'relays (timeout)')
            resolve()
          } else {
            reject(
              new Error(`Publish timeout after ${timeout}ms (succeeded to ${successCount} relays)`),
            )
          }
        }, timeout)

        const subscription = rxNostr.send(event, { relays }).subscribe({
          next: (packet) => {
            if (packet.ok) {
              console.log('[v0] Publish succeeded to', packet.from)
              successCount++

              // 最初の成功で即座に解決
              if (successCount >= minSuccessCount) {
                clearTimeout(timeoutId)
                subscription.unsubscribe()
                console.log('[v0] Publish complete (early success)')
                resolve()
              }
            } else {
              console.warn('[v0] Publish failed to', packet.from, packet.notice)
            }
          },
          complete: () => {
            clearTimeout(timeoutId)
            if (successCount >= minSuccessCount) {
              console.log('[v0] Publish complete')
              resolve()
            } else {
              reject(new Error(`Publish failed: succeeded to only ${successCount} relays`))
            }
          },
          error: (err) => {
            clearTimeout(timeoutId)
            console.error('[v0] Publish error:', err)
            reject(err)
          },
        })
      })
    },

    close() {
      // rx-nostrはグローバルインスタンスなので、個別のクライアントではcloseしない
      console.log('[v0] RelayClient close called (no-op for rx-nostr)')
    },
  }
}

/**
 * Settlementの全Eventを取得（一括取得）
 */
export async function fetchSettlementEvents(
  config: RelayConfig,
  settlementId: string,
): Promise<NostrToolsEvent[]> {
  console.log('[v0] fetchSettlementEvents:', settlementId)
  const rxNostr = getRxNostr()
  const { relays } = config

  const rxReq = createRxBackwardReq()

  const filter = {
    kinds: [SETTLEMENT_KIND, MEMBER_KIND, EXPENSE_KIND, LOCK_KIND],
    '#d': [settlementId],
  }

  console.log('[v0] Fetching with filter:', JSON.stringify(filter))

  return new Promise((resolve, reject) => {
    const events: NostrToolsEvent[] = []
    const timeout = config.timeout ?? 10000

    const timeoutId = setTimeout(() => {
      subscription.unsubscribe()
      rxReq.over()
      console.log('[v0] Fetch timeout, returning', events.length, 'events')
      resolve(events)
    }, timeout)

    const subscription = rxNostr
      .use(rxReq, { relays })
      .pipe(uniq())
      .subscribe({
        next: (packet) => {
          events.push(packet.event)
        },
        complete: () => {
          clearTimeout(timeoutId)
          console.log('[v0] Fetched', events.length, 'events')
          resolve(events)
        },
        error: (err) => {
          clearTimeout(timeoutId)
          console.error('[v0] Fetch error:', err)
          reject(err)
        },
      })

    rxReq.emit(filter)
    rxReq.over()
  })
}
