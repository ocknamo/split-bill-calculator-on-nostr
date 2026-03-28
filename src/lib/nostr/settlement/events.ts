/**
 * Event creation and parsing for settlement protocol
 */

import { calculateCap, calculateInviteHash, verifyCap } from './capability'
import {
  EXPENSE_KIND,
  type ExpenseContent,
  type ExpenseEvent,
  LOCK_KIND,
  type LockContent,
  type LockEvent,
  MEMBER_KIND,
  type MemberContent,
  type MemberEvent,
  type MemberInfo,
  type NostrEvent,
  SETTLEMENT_KIND,
  type SettlementContent,
  type SettlementEvent,
  type UnsignedEvent,
} from './events/types'

// ============================================================================
// Event Creation (returns unsigned events)
// ============================================================================

interface CreateSettlementEventParams {
  settlementId: string
  inviteToken: string
  ownerPubkey: string
  name: string
  currency: string
}

export async function createSettlementEvent(
  params: CreateSettlementEventParams
): Promise<UnsignedEvent> {
  const { settlementId, inviteToken, ownerPubkey, name, currency } = params
  const content: SettlementContent = { name, currency }
  const inviteHash = await calculateInviteHash(inviteToken)
  return {
    pubkey: ownerPubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: SETTLEMENT_KIND,
    tags: [
      ['d', settlementId],
      ['owner', ownerPubkey],
      ['invite_hash', inviteHash],
    ],
    content: JSON.stringify(content),
  }
}

interface CreateMemberEventParams {
  settlementId: string
  ownerPubkey: string
  members: MemberInfo[]
}

export function createMemberEvent(params: CreateMemberEventParams): UnsignedEvent {
  const { settlementId, ownerPubkey, members } = params
  const content: MemberContent = { members }
  return {
    pubkey: ownerPubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: MEMBER_KIND,
    tags: [['d', settlementId]],
    content: JSON.stringify(content),
  }
}

interface CreateExpenseEventParams {
  settlementId: string
  inviteToken: string
  actorPubkey: string
  memberPubkey: string
  amount: number
  currency: string
  note: string
}

export async function createExpenseEvent(params: CreateExpenseEventParams): Promise<UnsignedEvent> {
  const { settlementId, inviteToken, actorPubkey, memberPubkey, amount, currency, note } = params
  const content: ExpenseContent = { member_pubkey: memberPubkey, amount, currency, note }
  const cap = await calculateCap(inviteToken, actorPubkey)
  return {
    pubkey: actorPubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: EXPENSE_KIND,
    tags: [
      ['d', settlementId],
      ['cap', cap],
    ],
    content: JSON.stringify(content),
  }
}

interface CreateLockEventParams {
  settlementId: string
  ownerPubkey: string
  acceptedEventIds: string[]
}

export function createLockEvent(params: CreateLockEventParams): UnsignedEvent {
  const { settlementId, ownerPubkey, acceptedEventIds } = params
  const content: LockContent = { status: 'locked', accepted_event_ids: acceptedEventIds }
  return {
    pubkey: ownerPubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: LOCK_KIND,
    tags: [['d', settlementId]],
    content: JSON.stringify(content),
  }
}

// ============================================================================
// Event Parsing
// ============================================================================

function getTagValue(tags: string[][], tagName: string): string | undefined {
  const tag = tags.find((t) => t[0] === tagName)
  return tag?.[1]
}

export function parseSettlementEvent(event: NostrEvent): SettlementEvent | null {
  if (event.kind !== SETTLEMENT_KIND) return null
  try {
    const parsedContent = JSON.parse(event.content) as SettlementContent
    const settlementId = getTagValue(event.tags, 'd')
    const ownerPubkey = getTagValue(event.tags, 'owner')
    const inviteHash = getTagValue(event.tags, 'invite_hash')
    if (!settlementId || !ownerPubkey || !inviteHash) return null
    return { ...event, kind: SETTLEMENT_KIND, parsedContent, settlementId, ownerPubkey, inviteHash }
  } catch { return null }
}

export function parseMemberEvent(event: NostrEvent): MemberEvent | null {
  if (event.kind !== MEMBER_KIND) return null
  try {
    const parsedContent = JSON.parse(event.content) as MemberContent
    const settlementId = getTagValue(event.tags, 'd')
    if (!settlementId) return null
    return { ...event, kind: MEMBER_KIND, parsedContent, settlementId }
  } catch { return null }
}

export function parseExpenseEvent(event: NostrEvent): ExpenseEvent | null {
  if (event.kind !== EXPENSE_KIND) return null
  try {
    const parsedContent = JSON.parse(event.content) as ExpenseContent
    const settlementId = getTagValue(event.tags, 'd')
    const cap = getTagValue(event.tags, 'cap')
    if (!settlementId || !cap) return null
    return { ...event, kind: EXPENSE_KIND, parsedContent, settlementId, cap }
  } catch { return null }
}

export function parseLockEvent(event: NostrEvent): LockEvent | null {
  if (event.kind !== LOCK_KIND) return null
  try {
    const parsedContent = JSON.parse(event.content) as LockContent
    const settlementId = getTagValue(event.tags, 'd')
    if (!settlementId) return null
    return { ...event, kind: LOCK_KIND, parsedContent, settlementId }
  } catch { return null }
}

// ============================================================================
// Event Validation
// ============================================================================

export function validateSettlementEvent(event: SettlementEvent): boolean {
  return event.pubkey === event.ownerPubkey
}

export function validateMemberEvent(event: MemberEvent, ownerPubkey: string): boolean {
  return event.pubkey === ownerPubkey
}

export async function validateExpenseEvent(
  event: ExpenseEvent,
  inviteToken: string,
  validMemberPubkeys: string[]
): Promise<{ isValid: boolean; capValid: boolean; memberValid: boolean }> {
  const capValid = await verifyCap(event.cap, inviteToken, event.pubkey)
  const memberValid = validMemberPubkeys.includes(event.parsedContent.member_pubkey)
  return { isValid: capValid && memberValid, capValid, memberValid }
}
