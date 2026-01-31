/**
 * Nostr Event types for settlement protocol
 *
 * kind 30050: Settlement definition (parameterized replaceable)
 * kind 30051: Member definition (parameterized replaceable)
 * kind 1052:  Expense claim (normal event, append-only)
 * kind 30053: Lock/Agreement (parameterized replaceable)
 */

// Nostr Event kind constants
export const SETTLEMENT_KIND = 30050
export const MEMBER_KIND = 30051
export const EXPENSE_KIND = 1052
export const LOCK_KIND = 30053

// All settlement-related event kinds
export const SETTLEMENT_EVENT_KINDS = [
  SETTLEMENT_KIND,
  MEMBER_KIND,
  EXPENSE_KIND,
  LOCK_KIND,
] as const

// Base Nostr Event structure
export interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

// Unsigned event (before signing)
export interface UnsignedEvent {
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
}

// Settlement definition content (kind: 30050)
export interface SettlementContent {
  name: string
  currency: string
}

// Member in member definition
export interface MemberInfo {
  pubkey: string
  name: string
}

// Member definition content (kind: 30051)
export interface MemberContent {
  members: MemberInfo[]
}

// Expense claim content (kind: 1052)
export interface ExpenseContent {
  member_pubkey: string
  amount: number
  currency: string
  note: string
}

// Lock content (kind: 30053)
export interface LockContent {
  status: "locked"
  accepted_event_ids: string[]
}

// Parsed settlement event
export interface SettlementEvent extends NostrEvent {
  kind: typeof SETTLEMENT_KIND
  parsedContent: SettlementContent
  settlementId: string
  ownerPubkey: string
  inviteHash: string
}

// Parsed member event
export interface MemberEvent extends NostrEvent {
  kind: typeof MEMBER_KIND
  parsedContent: MemberContent
  settlementId: string
}

// Parsed expense event
export interface ExpenseEvent extends NostrEvent {
  kind: typeof EXPENSE_KIND
  parsedContent: ExpenseContent
  settlementId: string
  cap: string
}

// Parsed lock event
export interface LockEvent extends NostrEvent {
  kind: typeof LOCK_KIND
  parsedContent: LockContent
  settlementId: string
}
