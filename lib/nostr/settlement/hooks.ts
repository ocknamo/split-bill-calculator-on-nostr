"use client"

/**
 * Settlement同期用React Hooks
 */
import { useState, useEffect, useCallback, useRef } from "react"
import { generateSecretKey, getPublicKey, finalizeEvent, type Event } from "nostr-tools"
import { createRelayClient, fetchSettlementEvents, DEFAULT_RELAYS, type RelayClient, type RelayConfig } from "./relay"
import { buildSettlementState, type SettlementState } from "./state"

import {
  createExpenseEvent,
  createMemberEvent,
  createLockEvent,
  createSettlementEvent,
} from "./events"

/**
 * 招待リンクをパース
 */
export function parseInviteLink(
  url: string
): { settlementId: string; inviteToken: string } | null {
  try {
    const parsed = new URL(url)
    const settlementId = parsed.searchParams.get("s")
    const inviteToken = parsed.searchParams.get("t")

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
  url.searchParams.set("s", settlementId)
  url.searchParams.set("t", inviteToken)
  return url.toString()
}

/**
 * 招待リンク管理Hook
 */
export interface UseInviteLinkOptions {
  settlementId: string
  inviteToken: string
  baseUrl: string
}

export interface UseInviteLinkResult {
  inviteLink: string
  copied: boolean
  copyToClipboard: () => Promise<void>
}

export function useInviteLink(options: UseInviteLinkOptions): UseInviteLinkResult {
  const { settlementId, inviteToken, baseUrl } = options
  const [copied, setCopied] = useState(false)

  const inviteLink = generateInviteLink(settlementId, inviteToken, baseUrl)

  const copyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [inviteLink])

  return {
    inviteLink,
    copied,
    copyToClipboard,
  }
}

/**
 * Settlement作成用の関数
 * owner用: 新規SettlementEventを作成してRelayに発行
 */
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

export async function createSettlement(
  params: CreateSettlementParams
): Promise<CreateSettlementResult> {
  const { settlementId, inviteToken, name, currency, relays = DEFAULT_RELAYS } = params

  console.log("[v0] createSettlement: generating keypair")
  
  // Owner keypairを生成
  const sk = generateSecretKey()
  const ownerPubkey = getPublicKey(sk)

  console.log("[v0] createSettlement: creating event template")
  
  // Settlement Eventを作成
  const template = await createSettlementEvent({
    settlementId,
    inviteToken,
    ownerPubkey,
    name,
    currency,
  })
  
  console.log("[v0] createSettlement: finalizing event")
  const event = finalizeEvent(template, sk)
  console.log("[v0] createSettlement: event created", { id: event.id, kind: event.kind })

  // Relayに発行
  const config: RelayConfig = { relays, timeout: 10000 }
  const client = createRelayClient(config)
  
  try {
    console.log("[v0] createSettlement: publishing to relays")
    await client.publish(event)
    console.log("[v0] createSettlement: publish complete")
  } finally {
    client.close()
  }

  return {
    settlementId,
    inviteToken,
    ownerPubkey,
  }
}

/**
 * Settlement同期Hook
 */
export interface UseSettlementSyncOptions {
  settlementId: string
  inviteToken: string
  relays?: string[]
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error"

export interface UseSettlementSyncResult {
  state: SettlementState | null
  isLoading: boolean
  error: string | null
  isLocked: boolean
  isOwner: boolean
  connectionStatus: ConnectionStatus
  addExpense: (
    memberPubkey: string,
    amount: number,
    currency: string,
    note: string
  ) => Promise<void>
  addMember: (pubkey: string, name: string) => Promise<void>
  lockSettlement: (acceptedEventIds: string[]) => Promise<void>
  refresh: () => Promise<void>
}

export function useSettlementSync(
  options: UseSettlementSyncOptions
): UseSettlementSyncResult {
  const { settlementId, inviteToken, relays = DEFAULT_RELAYS } = options

  const [state, setState] = useState<SettlementState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting")

  // Actor keypair（一時鍵）
  const actorRef = useRef<{ sk: Uint8Array; pubkey: string } | null>(null)
  const clientRef = useRef<RelayClient | null>(null)

  // Actor keypairを初期化
  useEffect(() => {
    const sk = generateSecretKey()
    const pubkey = getPublicKey(sk)
    actorRef.current = { sk, pubkey }
  }, [])

  

  // Eventを受信して状態を更新
  const handleEvent = useCallback((event: Event) => {
    setEvents((prev) => {
      // 重複排除
      if (prev.some((e) => e.id === event.id)) {
        return prev
      }
      return [...prev, event]
    })
  }, [])

  // Event集合から状態を構築
  useEffect(() => {
    if (events.length === 0) return

    async function build() {
      try {
        const newState = await buildSettlementState(events, inviteToken, settlementId)
        setState(newState)
      } catch (err) {
        setError(err instanceof Error ? err.message : "State build failed")
      }
    }
    build()
  }, [events, inviteToken, settlementId])

  // 初期読み込み（リアルタイム購読は一旦無効化、querySync のみ使用）
  useEffect(() => {
    const config: RelayConfig = { relays, timeout: 10000 }

    async function init() {
      try {
        setIsLoading(true)
        setConnectionStatus("connecting")

        // 既存Eventを取得
        const existingEvents = await fetchSettlementEvents(config, settlementId)
        setEvents(existingEvents)
        
        // クライアントを保持（publish用）
        const client = createRelayClient(config)
        clientRef.current = client
        
        setIsLoading(false)
        setConnectionStatus("connected")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Init failed")
        setIsLoading(false)
        setConnectionStatus("error")
      }
    }

    init()

    return () => {
      clientRef.current?.close()
    }
  }, [settlementId, relays])

  // Expense追加
  const addExpense = useCallback(
    async (
      memberPubkey: string,
      amount: number,
      currency: string,
      note: string
    ) => {
      if (!actorRef.current || !clientRef.current) {
        throw new Error("Not initialized")
      }

      const { sk, pubkey } = actorRef.current

      const template = await createExpenseEvent({
        settlementId,
        inviteToken,
        actorPubkey: pubkey,
        memberPubkey,
        amount,
        currency,
        note,
      })
      const event = finalizeEvent(template, sk)

      await clientRef.current.publish(event)
      handleEvent(event)
    },
    [settlementId, inviteToken, handleEvent]
  )

  // Member追加
  const addMember = useCallback(
    async (memberPubkey: string, name: string) => {
      if (!actorRef.current || !clientRef.current) {
        throw new Error("Not initialized")
      }

      const { sk, pubkey } = actorRef.current

      const template = createMemberEvent({
        settlementId,
        ownerPubkey: pubkey,
        members: [{ pubkey: memberPubkey, name }],
      })
      const event = finalizeEvent(template, sk)

      await clientRef.current.publish(event)
      handleEvent(event)
    },
    [settlementId, handleEvent]
  )

  // Settlementをロック
  const lockSettlement = useCallback(
    async (acceptedEventIds: string[]) => {
      if (!actorRef.current || !clientRef.current) {
        throw new Error("Not initialized")
      }

      const { sk, pubkey } = actorRef.current

      const template = createLockEvent({
        settlementId,
        ownerPubkey: pubkey,
        acceptedEventIds,
      })
      const event = finalizeEvent(template, sk)

      await clientRef.current.publish(event)
      handleEvent(event)
    },
    [settlementId, handleEvent]
  )

  // 再取得
  const refresh = useCallback(async () => {
    const config: RelayConfig = { relays, timeout: 10000 }
    setIsLoading(true)
    setConnectionStatus("connecting")
    try {
      const existingEvents = await fetchSettlementEvents(config, settlementId)
      setEvents(existingEvents)
      setConnectionStatus("connected")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed")
      setConnectionStatus("error")
    } finally {
      setIsLoading(false)
    }
  }, [settlementId, relays])

  // Check if current user is owner
  const isOwner = actorRef.current
    ? state?.ownerPubkey === actorRef.current.pubkey
    : false

  return {
    state,
    isLoading,
    error,
    isLocked: state?.isLocked ?? false,
    isOwner,
    connectionStatus,
    addExpense,
    addMember,
    lockSettlement,
    refresh,
  }
}
