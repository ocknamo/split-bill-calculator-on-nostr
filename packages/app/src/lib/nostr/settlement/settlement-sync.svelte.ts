/**
 * Settlement同期クラス (Svelte 5 runes版)
 * React の useSettlementSync を Svelte 5 クラスに移植
 */
import { finalizeEvent, generateSecretKey, getPublicKey } from '@rx-nostr/crypto'
import { DEFAULT_RELAYS } from '$lib/constants'
import {
	createExpenseEvent,
	createLockEvent,
	createMemberEvent,
	createSettlementEvent
} from './events'
import {
	createRelayClient,
	fetchSettlementEvents,
	type RelayClient,
	type RelayConfig
} from './relay-rx'
import { buildSettlementState, type SettlementState } from './state'
import { loadOwnerKey, saveOwnerKey } from './storage'
import type { NostrEvent } from './events/types'

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

		if (!settlementId || !inviteToken) {
			return null
		}

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
	baseUrl: string
): string {
	const url = new URL(baseUrl)
	url.searchParams.set('s', settlementId)
	url.searchParams.set('t', inviteToken)
	return url.toString()
}

/**
 * Settlement作成
 */
export async function createSettlement(
	params: CreateSettlementParams
): Promise<CreateSettlementResult> {
	const { settlementId, inviteToken, name, currency, relays = DEFAULT_RELAYS } = params

	const sk = generateSecretKey()
	const ownerPubkey = getPublicKey(sk)

	saveOwnerKey(settlementId, sk, ownerPubkey)

	const template = await createSettlementEvent({
		settlementId,
		inviteToken,
		ownerPubkey,
		name,
		currency
	})

	const event = finalizeEvent(template, sk)

	const config: RelayConfig = { relays: [...relays], timeout: 10000 }
	const client = createRelayClient(config)

	try {
		await client.publish(event)
	} finally {
		client.close()
	}

	return { settlementId, inviteToken, ownerPubkey }
}

/**
 * Settlement同期クラス (Svelte 5 runes)
 */
export class SettlementSync {
	state = $state<SettlementState | null>(null)
	isLoading = $state(true)
	error = $state<string | null>(null)
	connectionStatus = $state<ConnectionStatus>('connecting')

	#settlementId: string
	#inviteToken: string
	#relays: string[]
	#events: NostrEvent[] = []
	#seenIds = new Set<string>()
	#client: RelayClient | null = null
	#actorSk: Uint8Array
	#actorPubkey: string
	#ownerKey: { sk: Uint8Array; pubkey: string } | null = null

	constructor(options: SettlementSyncOptions) {
		const { settlementId, inviteToken, relays = DEFAULT_RELAYS } = options
		this.#settlementId = settlementId
		this.#inviteToken = inviteToken
		this.#relays = relays

		// Generate ephemeral actor keypair
		this.#actorSk = generateSecretKey()
		this.#actorPubkey = getPublicKey(this.#actorSk)

		// Load owner key from storage
		this.#ownerKey = loadOwnerKey(settlementId)
	}

	get isOwner(): boolean {
		return (
			this.#ownerKey !== null &&
			this.state?.ownerPubkey !== undefined &&
			this.state.ownerPubkey === this.#ownerKey.pubkey
		)
	}

	get isLocked(): boolean {
		return this.state?.isLocked ?? false
	}

	#handleEvent(event: NostrEvent): void {
		if (this.#seenIds.has(event.id)) return
		this.#seenIds.add(event.id)
		this.#events = [...this.#events, event]
		this.#rebuildState()
	}

	#rebuildState(): void {
		buildSettlementState(this.#events, this.#inviteToken, this.#settlementId)
			.then((newState) => {
				this.state = newState
			})
			.catch((err) => {
				this.error = err instanceof Error ? err.message : 'State build failed'
			})
	}

	async init(): Promise<void> {
		const config: RelayConfig = { relays: [...this.#relays], timeout: 10000 }

		try {
			this.isLoading = true
			this.connectionStatus = 'connecting'

			const existingEvents = await fetchSettlementEvents(config, this.#settlementId)
			for (const event of existingEvents) {
				this.#handleEvent(event)
			}

			this.#client = createRelayClient(config)
			this.isLoading = false
			this.connectionStatus = 'connected'
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Init failed'
			this.isLoading = false
			this.connectionStatus = 'error'
		}
	}

	async addExpense(
		memberPubkey: string,
		amount: number,
		currency: string,
		note: string
	): Promise<void> {
		if (!this.#client) {
			throw new Error('Not initialized')
		}

		const template = await createExpenseEvent({
			settlementId: this.#settlementId,
			inviteToken: this.#inviteToken,
			actorPubkey: this.#actorPubkey,
			memberPubkey,
			amount,
			currency,
			note
		})

		const event = finalizeEvent(template, this.#actorSk)
		await this.#client.publish(event)
		this.#handleEvent(event)
	}

	async addMember(
		memberPubkey: string,
		name: string,
		picture?: string,
		lud16?: string
	): Promise<void> {
		if (!this.#ownerKey || !this.#client) {
			throw new Error('Owner権限がありません')
		}

		const { sk, pubkey } = this.#ownerKey
		const existingMembers = this.state?.members || []

		if (existingMembers.some((m) => m.pubkey === memberPubkey)) {
			throw new Error('このメンバーは既に追加されています')
		}

		const allMembers = [
			...existingMembers,
			{ pubkey: memberPubkey, name, picture, lud16 }
		]

		const template = createMemberEvent({
			settlementId: this.#settlementId,
			ownerPubkey: pubkey,
			members: allMembers
		})

		const event = finalizeEvent(template, sk)
		await this.#client.publish(event)
		this.#handleEvent(event)
	}

	async lockSettlement(acceptedEventIds: string[]): Promise<void> {
		if (!this.#ownerKey || !this.#client) {
			throw new Error('Owner権限がありません')
		}

		const { sk, pubkey } = this.#ownerKey

		const template = createLockEvent({
			settlementId: this.#settlementId,
			ownerPubkey: pubkey,
			acceptedEventIds
		})

		const event = finalizeEvent(template, sk)
		await this.#client.publish(event)
		this.#handleEvent(event)
	}

	async refresh(): Promise<void> {
		const config: RelayConfig = { relays: [...this.#relays], timeout: 10000 }
		this.isLoading = true
		this.connectionStatus = 'connecting'

		try {
			const existingEvents = await fetchSettlementEvents(config, this.#settlementId)
			this.#events = []
			this.#seenIds = new Set()
			for (const event of existingEvents) {
				this.#handleEvent(event)
			}
			this.connectionStatus = 'connected'
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Refresh failed'
			this.connectionStatus = 'error'
		} finally {
			this.isLoading = false
		}
	}

	destroy(): void {
		this.#client?.close()
		this.#client = null
	}
}
