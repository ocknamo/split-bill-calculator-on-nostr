/**
 * Settlement同期 (Svelte 5 クラスベース)
 * React の useSettlementSync を SettlementSync クラスに変換
 */
import { getEventHash, getPublicKey, getSignature } from '@rx-nostr/crypto'

function generateSecretKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function finalizeEvent(
  template: import('$lib/nostr/settlement/events/types').UnsignedEvent,
  sk: string,
): import('$lib/nostr/settlement/events/types').NostrEvent {
  const pubkey = getPublicKey(sk)
  const eventWithPubkey = { ...template, pubkey }
  const id = getEventHash(eventWithPubkey)
  const sig = getSignature(id, sk)
  return { ...eventWithPubkey, id, sig }
}
import { browser } from '$app/environment'
import { DEFAULT_RELAYS } from '$lib/constants'
import {
  createExpenseEvent,
  createLockEvent,
  createMemberEvent,
  createSettlementEvent,
} from '$lib/nostr/settlement/events'
import {
  createRelayClient,
  fetchSettlementEvents,
  type RelayClient,
  type RelayConfig,
} from '$lib/nostr/settlement/relay-rx'
import { buildSettlementState, type SettlementState } from '$lib/nostr/settlement/state'
import { loadOwnerKey, saveOwnerKey } from '$lib/nostr/settlement/storage'
import type { NostrEvent } from '$lib/nostr/settlement/events/types'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface SettlementSyncOptions {
  settlementId: string
  inviteToken: string
  relays?: string[]
}

export interface CreateSettlementParams {
  settlementId: string
  inviteToken: string
  name: string
  currency: string
  relays?: string[]
}

export interface CreateSettlementResult {
  settlementId: string
  inviteToken: string
  ownerPubkey: string
}

/**
 * 招待リンクをパース
 */
export function parseInviteLink(url: string): { settlementId: string; inviteToken: string } | null {
  try {
    const parsed = new URL(url)
    const settlementId = parsed.searchParams.get('s')
    const inviteToken = parsed.searchParams.get('t')
    if (!settlementId || !inviteToken) return null
    return { settlementId, inviteToken }
  } catch {
    return null
  }
}

/**
 * 招待リンクを生成
 */
export function generateInviteLink(
  settlementId: string,
  inviteToken: string,
  baseUrl: string,
): string {
  const url = new URL(baseUrl)
  url.searchParams.set('s', settlementId)
  url.searchParams.set('t', inviteToken)
  return url.toString()
}

/**
 * Settlement作成（Owner用）
 */
export async function createSettlement(
  params: CreateSettlementParams,
): Promise<CreateSettlementResult> {
  const { settlementId, inviteToken, name, currency, relays = [...DEFAULT_RELAYS] } = params

  const sk = generateSecretKey()
  const ownerPubkey = getPublicKey(sk)

  const skBytes = new Uint8Array(sk.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
  saveOwnerKey(settlementId, skBytes, ownerPubkey)

  const template = await createSettlementEvent({
    settlementId,
    inviteToken,
    ownerPubkey,
    name,
    currency,
  })
  const event = finalizeEvent(template, sk)

  const config: RelayConfig = { relays: [...relays], timeout: 10000 }
  const client = createRelayClient(config)
  try {
    await client.publish(event as NostrEvent)
  } finally {
    client.close()
  }

  return { settlementId, inviteToken, ownerPubkey }
}

/**
 * Settlement同期クラス (Svelte 5 $state)
 */
export class SettlementSync {
  #settlementId: string
  #inviteToken: string
  #relays: string[]

  #ownerKey: { sk: string; pubkey: string } | null = null
  #actorKey: { sk: string; pubkey: string } | null = null
  #client: RelayClient | null = null
  // [H2] 重複イベント防止 - 構造的に解決
  #seenIds = new Set<string>()
  #events: NostrEvent[] = []

  state = $state<SettlementState | null>(null)
  isLoading = $state(false)
  error = $state<string | null>(null)
  connectionStatus = $state<ConnectionStatus>('disconnected')

  constructor(options: SettlementSyncOptions) {
    this.#settlementId = options.settlementId
    this.#inviteToken = options.inviteToken
    this.#relays = options.relays ?? [...DEFAULT_RELAYS]

    if (browser) {
      this.#init()
    }
  }

  get isOwner(): boolean {
    return this.#ownerKey !== null && this.state?.ownerPubkey === this.#ownerKey.pubkey
  }

  get isLocked(): boolean {
    return this.state?.isLocked ?? false
  }

  async #init(): Promise<void> {
    const ownerKey = loadOwnerKey(this.#settlementId)
    if (ownerKey) {
      this.#ownerKey = {
        sk: Array.from(ownerKey.sk)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(''),
        pubkey: ownerKey.pubkey,
      }
    }

    const sk = generateSecretKey()
    const pubkey = getPublicKey(sk)
    this.#actorKey = { sk, pubkey }

    const config: RelayConfig = { relays: [...this.#relays], timeout: 10000 }
    this.isLoading = true
    this.connectionStatus = 'connecting'

    try {
      const existingEvents = await fetchSettlementEvents(config, this.#settlementId)
      for (const event of existingEvents) {
        this.#addEvent(event)
      }
      this.#client = createRelayClient(config)
      this.connectionStatus = 'connected'
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Init failed'
      this.connectionStatus = 'error'
    } finally {
      this.isLoading = false
    }

    await this.#buildState()
  }

  #addEvent(event: NostrEvent): void {
    if (this.#seenIds.has(event.id)) return
    this.#seenIds.add(event.id)
    this.#events = [...this.#events, event]
  }

  async #buildState(): Promise<void> {
    if (this.#events.length === 0) return
    try {
      this.state = await buildSettlementState(this.#events, this.#inviteToken, this.#settlementId)
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'State build failed'
    }
  }

  async addExpense(
    memberPubkey: string,
    amount: number,
    currency: string,
    note: string,
  ): Promise<void> {
    if (amount <= 0) throw new Error('金額は0より大きい値を入力してください')
    if (!this.#actorKey || !this.#client) throw new Error('Not initialized')

    const { sk, pubkey } = this.#actorKey
    const template = await createExpenseEvent({
      settlementId: this.#settlementId,
      inviteToken: this.#inviteToken,
      actorPubkey: pubkey,
      memberPubkey,
      amount,
      currency,
      note,
    })
    const event = finalizeEvent(template, sk)
    await this.#client.publish(event as NostrEvent)
    this.#addEvent(event as NostrEvent)
    await this.#buildState()
  }

  async addMember(
    memberPubkey: string,
    name: string,
    picture?: string,
    lud16?: string,
  ): Promise<void> {
    if (!this.#ownerKey || !this.#client) throw new Error('Owner権限がありません')

    const { sk, pubkey } = this.#ownerKey
    const existingMembers = this.state?.members ?? []

    if (existingMembers.some((m) => m.pubkey === memberPubkey)) {
      throw new Error('このメンバーは既に追加されています')
    }

    const allMembers = [...existingMembers, { pubkey: memberPubkey, name, picture, lud16 }]
    const template = createMemberEvent({
      settlementId: this.#settlementId,
      ownerPubkey: pubkey,
      members: allMembers,
    })
    const event = finalizeEvent(template, sk)
    await this.#client.publish(event as NostrEvent)
    this.#addEvent(event as NostrEvent)
    await this.#buildState()
  }

  async lockSettlement(acceptedEventIds: string[]): Promise<void> {
    if (!this.#ownerKey || !this.#client) throw new Error('Owner権限がありません')

    const { sk, pubkey } = this.#ownerKey
    const template = createLockEvent({
      settlementId: this.#settlementId,
      ownerPubkey: pubkey,
      acceptedEventIds,
    })
    const event = finalizeEvent(template, sk)
    await this.#client.publish(event as NostrEvent)
    this.#addEvent(event as NostrEvent)
    await this.#buildState()
  }

  async refresh(): Promise<void> {
    if (!browser) return
    const config: RelayConfig = { relays: [...this.#relays], timeout: 10000 }
    this.isLoading = true
    this.connectionStatus = 'connecting'
    try {
      const existingEvents = await fetchSettlementEvents(config, this.#settlementId)
      for (const event of existingEvents) {
        this.#addEvent(event)
      }
      this.connectionStatus = 'connected'
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Refresh failed'
      this.connectionStatus = 'error'
    } finally {
      this.isLoading = false
    }
    await this.#buildState()
  }

  destroy(): void {
    this.#client?.close()
  }
}
