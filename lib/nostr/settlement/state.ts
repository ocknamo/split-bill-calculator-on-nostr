/**
 * Settlement state builder
 *
 * Builds the settlement state from a collection of Nostr events.
 * Handles:
 * - Event filtering and validation
 * - Parameterized replaceable event handling (latest wins)
 * - Lock state management
 * - Capability verification
 */

import {
  parseExpenseEvent,
  parseLockEvent,
  parseMemberEvent,
  parseSettlementEvent,
  validateExpenseEvent,
  validateMemberEvent,
  validateSettlementEvent,
} from "./events"
import type {
  ExpenseEvent,
  LockEvent,
  MemberEvent,
  MemberInfo,
  NostrEvent,
  SettlementEvent,
} from "./events/types"

// ============================================================================
// Types
// ============================================================================

export interface InvalidExpense {
  event: ExpenseEvent
  reason: "invalid_cap" | "invalid_member"
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
  // Derived for easy access
  name: string
  currency: string
  ownerPubkey: string

  // Core settlement data
  settlement: SettlementEvent
  members: MemberInfo[]
  expenses: ExpenseData[]
  validExpenses: ExpenseEvent[]
  invalidExpenses: InvalidExpense[]

  // Lock state
  isLocked: boolean
  lockEvent: LockEvent | null
  missingEventIds: string[]

  // Raw events for reference
  memberEvent: MemberEvent | null
}

// ============================================================================
// State Builder
// ============================================================================

/**
 * Builds the settlement state from a collection of events.
 *
 * @param events - All events related to this settlement
 * @param inviteToken - The invite token for capability verification
 * @param settlementId - The settlement ID to filter events
 * @returns SettlementState or null if essential events are missing
 */
export async function buildSettlementState(
  events: NostrEvent[],
  inviteToken: string,
  settlementId: string
): Promise<SettlementState | null> {
  // Step 1: Parse and filter events by settlement ID
  const parsedEvents = categorizeEvents(events, settlementId)

  // Step 2: Get settlement definition (required)
  const settlement = findValidSettlement(parsedEvents.settlements)
  if (!settlement) {
    return null
  }

  // Step 3: Get latest valid member definition
  const memberEvent = findLatestValidMemberEvent(
    parsedEvents.members,
    settlement.ownerPubkey
  )
  const members = memberEvent?.parsedContent.members ?? []
  const validMemberPubkeys = members.map((m) => m.pubkey)

  // Step 4: Check for lock event
  const lockEvent = findValidLockEvent(
    parsedEvents.locks,
    settlement.ownerPubkey
  )
  const isLocked = lockEvent !== null

  // Step 5: Process expense events
  let validExpenses: ExpenseEvent[] = []
  let invalidExpenses: InvalidExpense[] = []
  let missingEventIds: string[] = []

  if (isLocked && lockEvent) {
    // After lock: only include accepted events
    const acceptedIds = new Set(lockEvent.parsedContent.accepted_event_ids)
    const foundIds = new Set<string>()

    for (const expense of parsedEvents.expenses) {
      if (acceptedIds.has(expense.id)) {
        // Verify the expense is still valid
        const validation = await validateExpenseEvent(
          expense,
          inviteToken,
          validMemberPubkeys
        )
        if (validation.isValid) {
          validExpenses.push(expense)
          foundIds.add(expense.id)
        }
      }
    }

    // Check for missing accepted events
    missingEventIds = [...acceptedIds].filter((id) => !foundIds.has(id))
  } else {
    // Before lock: validate all expenses
    const result = await categorizeExpenses(
      parsedEvents.expenses,
      inviteToken,
      validMemberPubkeys
    )
    validExpenses = result.valid
    invalidExpenses = result.invalid
  }

  // Convert valid expenses to simplified format
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

// ============================================================================
// Internal Helpers
// ============================================================================

interface CategorizedEvents {
  settlements: SettlementEvent[]
  members: MemberEvent[]
  expenses: ExpenseEvent[]
  locks: LockEvent[]
}

function categorizeEvents(
  events: NostrEvent[],
  settlementId: string
): CategorizedEvents {
  const result: CategorizedEvents = {
    settlements: [],
    members: [],
    expenses: [],
    locks: [],
  }

  for (const event of events) {
    // Try to parse as settlement
    const settlement = parseSettlementEvent(event)
    if (settlement && settlement.settlementId === settlementId) {
      result.settlements.push(settlement)
      continue
    }

    // Try to parse as member
    const member = parseMemberEvent(event)
    if (member && member.settlementId === settlementId) {
      result.members.push(member)
      continue
    }

    // Try to parse as expense
    const expense = parseExpenseEvent(event)
    if (expense && expense.settlementId === settlementId) {
      result.expenses.push(expense)
      continue
    }

    // Try to parse as lock
    const lock = parseLockEvent(event)
    if (lock && lock.settlementId === settlementId) {
      result.locks.push(lock)
    }
  }

  return result
}

function findValidSettlement(
  settlements: SettlementEvent[]
): SettlementEvent | null {
  // Find the first valid settlement (should only be one per settlement_id + pubkey)
  for (const settlement of settlements) {
    if (validateSettlementEvent(settlement)) {
      return settlement
    }
  }
  return null
}

function findLatestValidMemberEvent(
  members: MemberEvent[],
  ownerPubkey: string
): MemberEvent | null {
  // Filter valid member events (signed by owner)
  const validMembers = members.filter((m) =>
    validateMemberEvent(m, ownerPubkey)
  )

  if (validMembers.length === 0) {
    return null
  }

  // Return the latest one (parameterized replaceable)
  return validMembers.reduce((latest, current) =>
    current.created_at > latest.created_at ? current : latest
  )
}

function findValidLockEvent(
  locks: LockEvent[],
  ownerPubkey: string
): LockEvent | null {
  // Filter valid lock events (signed by owner)
  const validLocks = locks.filter((l) => l.pubkey === ownerPubkey)

  if (validLocks.length === 0) {
    return null
  }

  // Return the latest one (parameterized replaceable)
  return validLocks.reduce((latest, current) =>
    current.created_at > latest.created_at ? current : latest
  )
}

async function categorizeExpenses(
  expenses: ExpenseEvent[],
  inviteToken: string,
  validMemberPubkeys: string[]
): Promise<{ valid: ExpenseEvent[]; invalid: InvalidExpense[] }> {
  const valid: ExpenseEvent[] = []
  const invalid: InvalidExpense[] = []

  for (const expense of expenses) {
    const validation = await validateExpenseEvent(
      expense,
      inviteToken,
      validMemberPubkeys
    )

    if (validation.isValid) {
      valid.push(expense)
    } else if (!validation.capValid) {
      invalid.push({ event: expense, reason: "invalid_cap" })
    } else if (!validation.memberValid) {
      invalid.push({ event: expense, reason: "invalid_member" })
    }
  }

  return { valid, invalid }
}
