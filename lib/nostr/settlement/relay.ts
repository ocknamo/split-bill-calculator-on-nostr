/**
 * Relay通信層
 * NostrリレーとのEvent送受信を管理
 */
import { SimplePool, type Event, type Filter } from "nostr-tools"
import {
  SETTLEMENT_KIND,
  MEMBER_KIND,
  EXPENSE_KIND,
  LOCK_KIND,
} from "./events/types"

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

      const filterKinds = kinds ?? [
        SETTLEMENT_KIND,
        MEMBER_KIND,
        EXPENSE_KIND,
        LOCK_KIND,
      ]

      const filter: Filter = {
        kinds: filterKinds,
        "#d": [settlementId],
      }
      
      console.log("[v0] Subscribing with filter:", JSON.stringify(filter))

      const subCloser = pool.subscribeMany(
        relays,
        [filter],
        {
          onevent(event: Event) {
            console.log("[v0] Received event:", event.id, event.kind)
            onEvent(event)
          },
          oneose() {
            console.log("[v0] EOSE received")
            onEose?.()
          },
        }
      )

      return {
        close: () => subCloser.close(),
      }
    },

    async publish(event: Event): Promise<void> {
      console.log("[v0] Publishing event:", { id: event.id, kind: event.kind, relays })
      
      // pool.publish returns an array of Promises, one for each relay
      // We need to wait for at least one to succeed
      const timeout = config.timeout ?? 10000
      
      // Wrap each relay promise with a timeout
      const publishPromises = pool.publish(relays, event).map((promise, i) =>
        Promise.race([
          promise.then(() => {
            console.log("[v0] Published to relay:", relays[i])
            return relays[i]
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: ${relays[i]}`)), timeout)
          ),
        ])
      )

      try {
        // Wait for at least one relay to accept
        const successRelay = await Promise.any(publishPromises)
        console.log("[v0] Publish succeeded via:", successRelay)
      } catch (err) {
        console.error("[v0] All relays failed:", err)
        // All relays failed
        if (err instanceof AggregateError) {
          throw new Error(`Failed to publish to any relay: ${err.errors.map((e) => e.message).join(", ")}`)
        }
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
  console.log("[v0] fetchSettlementEvents:", settlementId)
  const pool = new SimplePool()
  const { relays } = config

  const filter: Filter = {
    kinds: [SETTLEMENT_KIND, MEMBER_KIND, EXPENSE_KIND, LOCK_KIND],
    "#d": [settlementId],
  }

  console.log("[v0] querySync with filter:", JSON.stringify(filter))

  try {
    // Use querySync for simpler one-time fetch
    const events = await pool.querySync(relays, filter)
    console.log("[v0] querySync got", events.length, "events")
    return events
  } catch (err) {
    console.error("[v0] querySync error:", err)
    return []
  } finally {
    pool.close(relays)
  }
}

/**
 * デフォルトのRelay一覧
 */
export const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.snort.social",
]
