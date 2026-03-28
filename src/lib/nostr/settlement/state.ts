/**
 * Settlement state builder
 */

import {
  parseExpenseEvent,
  parseLockEvent,
  parseMemberEvent,
  parseSettlementEvent,
  validateExpenseEvent,
  validateMemberEvent,
  validateSettlementEvent,
} from './events'
import type {
  ExpenseEvent,
  LockEvent,
  MemberEvent,
  MemberInfo,
  NostrEvent,
  SettlementEvent,
} from './events/types'

export interface InvalidExpense {
  event: ExpenseEvent
  reason: 'invalid_cap' | 'invalid_member'
}

export interface ExpenseData {
  eventId: string
  memberPubkey: string
  amount: number
  currency: string
  note: string
  actorPubkey: string
  createdAt: number
}

export interface SettlementState {
  name: string
  currency: string
  ownerPubkey: string
  settlement: SettlementEvent
  members: MemberInfo[]
  expenses: ExpenseData[]
  validExpenses: ExpenseEvent[]
  invalidExpenses: InvalidExpense[]
  isLocked: boolean
  lockEvent: LockEvent | null
  missingEventIds: string[]
  memberEvent: MemberEvent | null
}

export async function buildSettlementState(
  events: NostrEvent[],
  inviteToken: string,
  settlementId: string,
): Promise<SettlementState | null> {
  const parsedEvents = categorizeEvents(events, settlementId)

  const settlement = findValidSettlement(parsedEvents.settlements)
  if (!settlement) return null

  const memberEvent = findLatestValidMemberEvent(parsedEvents.members, settlement.ownerPubkey)
  const members = memberEvent?.parsedContent.members ?? []
  const validMemberPubkeys = members.map((m) => m.pubkey)

  const lockEvent = findValidLockEvent(parsedEvents.locks, settlement.ownerPubkey)
  const isLocked = lockEvent !== null

  let validExpenses: ExpenseEvent[] = []
  let invalidExpenses: InvalidExpense[] = []
  let missingEventIds: string[] = []

  if (isLocked && lockEvent) {
    const acceptedIds = new Set(lockEvent.parsedContent.accepted_event_ids)
    const foundIds = new Set<string>()
    for (const expense of parsedEvents.expenses) {
      if (acceptedIds.has(expense.id)) {
        const validation = await validateExpenseEvent(expense, inviteToken, validMemberPubkeys)
        if (validation.isValid) {
          validExpenses.push(expense)
          foundIds.add(expense.id)
        }
      }
    }
    missingEventIds = [...acceptedIds].filter((id) => !foundIds.has(id))
  } else {
    const result = await categorizeExpenses(parsedEvents.expenses, inviteToken, validMemberPubkeys)
    validExpenses = result.valid
    invalidExpenses = result.invalid
  }

  const expenses: ExpenseData[] = validExpenses.map((e) => ({
    eventId: e.id,
    memberPubkey: e.parsedContent.member_pubkey,
    amount: e.parsedContent.amount,
    currency: e.parsedContent.currency,
    note: e.parsedContent.note,
    actorPubkey: e.pubkey,
    createdAt: e.created_at,
  }))

  return {
    name: settlement.parsedContent.name,
    currency: settlement.parsedContent.currency,
    ownerPubkey: settlement.ownerPubkey,
    settlement,
    members,
    expenses,
    validExpenses,
    invalidExpenses,
    isLocked,
    lockEvent,
    missingEventIds,
    memberEvent,
  }
}

interface CategorizedEvents {
  settlements: SettlementEvent[]
  members: MemberEvent[]
  expenses: ExpenseEvent[]
  locks: LockEvent[]
}

function categorizeEvents(events: NostrEvent[], settlementId: string): CategorizedEvents {
  const result: CategorizedEvents = { settlements: [], members: [], expenses: [], locks: [] }
  for (const event of events) {
    const settlement = parseSettlementEvent(event)
    if (settlement && settlement.settlementId === settlementId) {
      result.settlements.push(settlement)
      continue
    }
    const member = parseMemberEvent(event)
    if (member && member.settlementId === settlementId) {
      result.members.push(member)
      continue
    }
    const expense = parseExpenseEvent(event)
    if (expense && expense.settlementId === settlementId) {
      result.expenses.push(expense)
      continue
    }
    const lock = parseLockEvent(event)
    if (lock && lock.settlementId === settlementId) {
      result.locks.push(lock)
    }
  }
  return result
}

function findValidSettlement(settlements: SettlementEvent[]): SettlementEvent | null {
  for (const settlement of settlements) {
    if (validateSettlementEvent(settlement)) return settlement
  }
  return null
}

function findLatestValidMemberEvent(
  members: MemberEvent[],
  ownerPubkey: string,
): MemberEvent | null {
  const valid = members.filter((m) => validateMemberEvent(m, ownerPubkey))
  if (valid.length === 0) return null
  return valid.reduce((latest, current) =>
    current.created_at > latest.created_at ? current : latest,
  )
}

function findValidLockEvent(locks: LockEvent[], ownerPubkey: string): LockEvent | null {
  const valid = locks.filter((l) => l.pubkey === ownerPubkey)
  if (valid.length === 0) return null
  return valid.reduce((latest, current) =>
    current.created_at > latest.created_at ? current : latest,
  )
}

async function categorizeExpenses(
  expenses: ExpenseEvent[],
  inviteToken: string,
  validMemberPubkeys: string[],
): Promise<{ valid: ExpenseEvent[]; invalid: InvalidExpense[] }> {
  const valid: ExpenseEvent[] = []
  const invalid: InvalidExpense[] = []
  for (const expense of expenses) {
    const validation = await validateExpenseEvent(expense, inviteToken, validMemberPubkeys)
    if (validation.isValid) {
      valid.push(expense)
    } else if (!validation.capValid) {
      invalid.push({ event: expense, reason: 'invalid_cap' })
    } else if (!validation.memberValid) {
      invalid.push({ event: expense, reason: 'invalid_member' })
    }
  }
  return { valid, invalid }
}
