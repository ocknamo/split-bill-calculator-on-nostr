import { describe, it, expect } from "vitest"
import {
  buildSettlementState,
  type SettlementState,
} from "../state"
import {
  createSettlementEvent,
  createMemberEvent,
  createExpenseEvent,
  createLockEvent,
} from "../events"
import { generateSettlementId } from "../id"
import { generateInviteToken } from "../capability"
import type { NostrEvent } from "../events/types"

// Helper to create a mock signed event
function mockSign(unsigned: ReturnType<typeof createSettlementEvent>, id: string): NostrEvent {
  return {
    ...unsigned,
    id,
    sig: "mock_signature",
  }
}

describe("buildSettlementState", () => {
  const settlementId = generateSettlementId()
  const inviteToken = generateInviteToken()
  const ownerPubkey = "owner_pubkey_hex"
  const member1Pubkey = "member1_pubkey"
  const member2Pubkey = "member2_pubkey"

  function createTestEvents() {
    const settlementEvent = mockSign(
      createSettlementEvent({
        settlementId,
        inviteToken,
        ownerPubkey,
        name: "Test Trip",
        currency: "JPY",
      }),
      "settlement_event_id"
    )

    const memberEvent = mockSign(
      createMemberEvent({
        settlementId,
        ownerPubkey,
        members: [
          { pubkey: member1Pubkey, name: "Member 1" },
          { pubkey: member2Pubkey, name: "Member 2" },
        ],
      }),
      "member_event_id"
    )

    const expense1 = mockSign(
      createExpenseEvent({
        settlementId,
        inviteToken,
        actorPubkey: ownerPubkey,
        memberPubkey: member1Pubkey,
        amount: 3000,
        currency: "JPY",
        note: "Dinner",
      }),
      "expense1_id"
    )

    const expense2 = mockSign(
      createExpenseEvent({
        settlementId,
        inviteToken,
        actorPubkey: ownerPubkey,
        memberPubkey: member2Pubkey,
        amount: 2000,
        currency: "JPY",
        note: "Lunch",
      }),
      "expense2_id"
    )

    return { settlementEvent, memberEvent, expense1, expense2 }
  }

  it("should build state from valid events (before lock)", () => {
    const { settlementEvent, memberEvent, expense1, expense2 } = createTestEvents()
    const events = [settlementEvent, memberEvent, expense1, expense2]

    const state = buildSettlementState(events, inviteToken, settlementId)

    expect(state).not.toBeNull()
    expect(state?.settlement?.parsedContent.name).toBe("Test Trip")
    expect(state?.members).toHaveLength(2)
    expect(state?.validExpenses).toHaveLength(2)
    expect(state?.invalidExpenses).toHaveLength(0)
    expect(state?.isLocked).toBe(false)
  })

  it("should return null if settlement event is missing", () => {
    const { memberEvent, expense1 } = createTestEvents()
    const events = [memberEvent, expense1]

    const state = buildSettlementState(events, inviteToken, settlementId)

    expect(state).toBeNull()
  })

  it("should filter out expenses with invalid cap", () => {
    const { settlementEvent, memberEvent, expense1 } = createTestEvents()
    
    // Create expense with wrong cap (different token)
    const wrongToken = generateInviteToken()
    const invalidExpense = mockSign(
      createExpenseEvent({
        settlementId,
        inviteToken: wrongToken, // wrong token
        actorPubkey: "attacker_pubkey",
        memberPubkey: member1Pubkey,
        amount: 99999,
        currency: "JPY",
        note: "Spam",
      }),
      "invalid_expense_id"
    )

    const events = [settlementEvent, memberEvent, expense1, invalidExpense]
    const state = buildSettlementState(events, inviteToken, settlementId)

    expect(state?.validExpenses).toHaveLength(1)
    expect(state?.invalidExpenses).toHaveLength(1)
    expect(state?.invalidExpenses[0].reason).toBe("invalid_cap")
  })

  it("should mark expenses with unknown member as pending", () => {
    const { settlementEvent, memberEvent, expense1 } = createTestEvents()
    
    // Create expense for unknown member
    const unknownMemberExpense = mockSign(
      createExpenseEvent({
        settlementId,
        inviteToken,
        actorPubkey: ownerPubkey,
        memberPubkey: "unknown_member_pubkey",
        amount: 1000,
        currency: "JPY",
        note: "Unknown member expense",
      }),
      "unknown_member_expense_id"
    )

    const events = [settlementEvent, memberEvent, expense1, unknownMemberExpense]
    const state = buildSettlementState(events, inviteToken, settlementId)

    expect(state?.validExpenses).toHaveLength(1)
    expect(state?.invalidExpenses).toHaveLength(1)
    expect(state?.invalidExpenses[0].reason).toBe("invalid_member")
  })

  it("should only include accepted events after lock", () => {
    const { settlementEvent, memberEvent, expense1, expense2 } = createTestEvents()

    const lockEvent = mockSign(
      createLockEvent({
        settlementId,
        ownerPubkey,
        acceptedEventIds: ["expense1_id"], // only accept expense1
      }),
      "lock_event_id"
    )

    const events = [settlementEvent, memberEvent, expense1, expense2, lockEvent]
    const state = buildSettlementState(events, inviteToken, settlementId)

    expect(state?.isLocked).toBe(true)
    expect(state?.validExpenses).toHaveLength(1)
    expect(state?.validExpenses[0].id).toBe("expense1_id")
    // expense2 is excluded because it's not in accepted_event_ids
    expect(state?.invalidExpenses).toHaveLength(0)
  })

  it("should warn about missing accepted events after lock", () => {
    const { settlementEvent, memberEvent, expense1 } = createTestEvents()

    const lockEvent = mockSign(
      createLockEvent({
        settlementId,
        ownerPubkey,
        acceptedEventIds: ["expense1_id", "missing_event_id"],
      }),
      "lock_event_id"
    )

    const events = [settlementEvent, memberEvent, expense1, lockEvent]
    const state = buildSettlementState(events, inviteToken, settlementId)

    expect(state?.isLocked).toBe(true)
    expect(state?.missingEventIds).toContain("missing_event_id")
  })

  it("should use latest member event (parameterized replaceable)", () => {
    const { settlementEvent, expense1 } = createTestEvents()

    // First member event
    const memberEvent1 = {
      ...mockSign(
        createMemberEvent({
          settlementId,
          ownerPubkey,
          members: [{ pubkey: member1Pubkey, name: "Old Name" }],
        }),
        "member_event_1"
      ),
      created_at: 1000,
    }

    // Second member event (newer)
    const memberEvent2 = {
      ...mockSign(
        createMemberEvent({
          settlementId,
          ownerPubkey,
          members: [
            { pubkey: member1Pubkey, name: "New Name" },
            { pubkey: member2Pubkey, name: "Member 2" },
          ],
        }),
        "member_event_2"
      ),
      created_at: 2000,
    }

    const events = [settlementEvent, memberEvent1, memberEvent2, expense1]
    const state = buildSettlementState(events, inviteToken, settlementId)

    expect(state?.members).toHaveLength(2)
    expect(state?.members.find((m) => m.pubkey === member1Pubkey)?.name).toBe("New Name")
  })

  it("should ignore member event not signed by owner", () => {
    const { settlementEvent, expense1 } = createTestEvents()

    // Attacker tries to add themselves as member
    const attackerMemberEvent = mockSign(
      createMemberEvent({
        settlementId,
        ownerPubkey: "attacker_pubkey", // wrong signer
        members: [{ pubkey: "attacker_pubkey", name: "Attacker" }],
      }),
      "attacker_member_event"
    )

    const validMemberEvent = mockSign(
      createMemberEvent({
        settlementId,
        ownerPubkey,
        members: [{ pubkey: member1Pubkey, name: "Member 1" }],
      }),
      "valid_member_event"
    )

    const events = [settlementEvent, attackerMemberEvent, validMemberEvent, expense1]
    const state = buildSettlementState(events, inviteToken, settlementId)

    expect(state?.members).toHaveLength(1)
    expect(state?.members[0].pubkey).toBe(member1Pubkey)
  })
})
