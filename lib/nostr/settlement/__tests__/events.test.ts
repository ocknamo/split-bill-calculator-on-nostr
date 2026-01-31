import { describe, it, expect } from "vitest"
import {
  createSettlementEvent,
  createMemberEvent,
  createExpenseEvent,
  createLockEvent,
  parseSettlementEvent,
  parseMemberEvent,
  parseExpenseEvent,
  parseLockEvent,
  validateSettlementEvent,
  validateMemberEvent,
  validateExpenseEvent,
} from "../events"
import { generateSettlementId } from "../id"
import { generateInviteToken, calculateInviteHash, calculateCap } from "../capability"
import {
  SETTLEMENT_KIND,
  MEMBER_KIND,
  EXPENSE_KIND,
  LOCK_KIND,
} from "../events/types"

describe("createSettlementEvent", () => {
  it("should create an unsigned settlement event with correct structure", async () => {
    const settlementId = generateSettlementId()
    const inviteToken = generateInviteToken()
    const ownerPubkey = "owner_pubkey_hex"

    const event = await createSettlementEvent({
      settlementId,
      inviteToken,
      ownerPubkey,
      name: "Okinawa Trip",
      currency: "JPY",
    })

    expect(event.kind).toBe(SETTLEMENT_KIND)
    expect(event.pubkey).toBe(ownerPubkey)

    // Check tags
    const dTag = event.tags.find((t) => t[0] === "d")
    expect(dTag).toBeDefined()
    expect(dTag?.[1]).toBe(settlementId)

    const ownerTag = event.tags.find((t) => t[0] === "owner")
    expect(ownerTag).toBeDefined()
    expect(ownerTag?.[1]).toBe(ownerPubkey)

    const inviteHashTag = event.tags.find((t) => t[0] === "invite_hash")
    expect(inviteHashTag).toBeDefined()
    expect(inviteHashTag?.[1]).toBe(await calculateInviteHash(inviteToken))

    // Check content
    const content = JSON.parse(event.content)
    expect(content.name).toBe("Okinawa Trip")
    expect(content.currency).toBe("JPY")
  })
})

describe("createMemberEvent", () => {
  it("should create an unsigned member event with correct structure", () => {
    const settlementId = generateSettlementId()
    const ownerPubkey = "owner_pubkey_hex"
    const members = [
      { pubkey: "member1_pubkey", name: "Tanaka Taro" },
      { pubkey: "member2_pubkey", name: "Yamada Hanako" },
    ]

    const event = createMemberEvent({
      settlementId,
      ownerPubkey,
      members,
    })

    expect(event.kind).toBe(MEMBER_KIND)
    expect(event.pubkey).toBe(ownerPubkey)

    // Check tags
    const dTag = event.tags.find((t) => t[0] === "d")
    expect(dTag?.[1]).toBe(settlementId)

    // Check content
    const content = JSON.parse(event.content)
    expect(content.members).toEqual(members)
  })
})

describe("createExpenseEvent", () => {
  it("should create an unsigned expense event with cap tag", async () => {
    const settlementId = generateSettlementId()
    const inviteToken = generateInviteToken()
    const actorPubkey = "actor_pubkey_hex"
    const memberPubkey = "member_pubkey_hex"

    const event = await createExpenseEvent({
      settlementId,
      inviteToken,
      actorPubkey,
      memberPubkey,
      amount: 4500,
      currency: "JPY",
      note: "Day 1 dinner",
    })

    expect(event.kind).toBe(EXPENSE_KIND)
    expect(event.pubkey).toBe(actorPubkey)

    // Check tags
    const dTag = event.tags.find((t) => t[0] === "d")
    expect(dTag?.[1]).toBe(settlementId)

    const capTag = event.tags.find((t) => t[0] === "cap")
    expect(capTag).toBeDefined()
    expect(capTag?.[1]).toBe(await calculateCap(inviteToken, actorPubkey))

    // Check content
    const content = JSON.parse(event.content)
    expect(content.member_pubkey).toBe(memberPubkey)
    expect(content.amount).toBe(4500)
    expect(content.currency).toBe("JPY")
    expect(content.note).toBe("Day 1 dinner")
  })

  it("should allow negative amounts for corrections", async () => {
    const settlementId = generateSettlementId()
    const inviteToken = generateInviteToken()

    const event = await createExpenseEvent({
      settlementId,
      inviteToken,
      actorPubkey: "actor",
      memberPubkey: "member",
      amount: -1000,
      currency: "JPY",
      note: "Correction",
    })

    const content = JSON.parse(event.content)
    expect(content.amount).toBe(-1000)
  })
})

describe("createLockEvent", () => {
  it("should create an unsigned lock event", () => {
    const settlementId = generateSettlementId()
    const ownerPubkey = "owner_pubkey_hex"
    const acceptedEventIds = ["event1", "event2", "event3"]

    const event = createLockEvent({
      settlementId,
      ownerPubkey,
      acceptedEventIds,
    })

    expect(event.kind).toBe(LOCK_KIND)
    expect(event.pubkey).toBe(ownerPubkey)

    // Check tags
    const dTag = event.tags.find((t) => t[0] === "d")
    expect(dTag?.[1]).toBe(settlementId)

    // Check content
    const content = JSON.parse(event.content)
    expect(content.status).toBe("locked")
    expect(content.accepted_event_ids).toEqual(acceptedEventIds)
  })
})

describe("parseSettlementEvent", () => {
  it("should parse a valid settlement event", async () => {
    const settlementId = generateSettlementId()
    const inviteToken = generateInviteToken()
    const ownerPubkey = "owner_pubkey_hex"

    const unsigned = await createSettlementEvent({
      settlementId,
      inviteToken,
      ownerPubkey,
      name: "Trip",
      currency: "JPY",
    })

    // Simulate signed event
    const signedEvent = {
      ...unsigned,
      id: "event_id",
      sig: "signature",
    }

    const parsed = parseSettlementEvent(signedEvent)
    expect(parsed).not.toBeNull()
    expect(parsed?.settlementId).toBe(settlementId)
    expect(parsed?.ownerPubkey).toBe(ownerPubkey)
    expect(parsed?.inviteHash).toBe(await calculateInviteHash(inviteToken))
    expect(parsed?.parsedContent.name).toBe("Trip")
    expect(parsed?.parsedContent.currency).toBe("JPY")
  })

  it("should return null for invalid kind", () => {
    const event = {
      id: "id",
      pubkey: "pubkey",
      created_at: Date.now(),
      kind: 1, // wrong kind
      tags: [],
      content: "{}",
      sig: "sig",
    }
    expect(parseSettlementEvent(event)).toBeNull()
  })
})

describe("validateSettlementEvent", () => {
  it("should return true when pubkey matches owner tag", async () => {
    const settlementId = generateSettlementId()
    const inviteToken = generateInviteToken()
    const ownerPubkey = "owner_pubkey_hex"

    const unsigned = await createSettlementEvent({
      settlementId,
      inviteToken,
      ownerPubkey,
      name: "Trip",
      currency: "JPY",
    })

    const signedEvent = { ...unsigned, id: "id", sig: "sig" }
    const parsed = parseSettlementEvent(signedEvent)

    expect(validateSettlementEvent(parsed!)).toBe(true)
  })

  it("should return false when pubkey does not match owner tag", async () => {
    const settlementId = generateSettlementId()
    const inviteToken = generateInviteToken()
    const ownerPubkey = "owner_pubkey_hex"

    const unsigned = await createSettlementEvent({
      settlementId,
      inviteToken,
      ownerPubkey,
      name: "Trip",
      currency: "JPY",
    })

    // Tamper with pubkey
    const signedEvent = { ...unsigned, pubkey: "different_pubkey", id: "id", sig: "sig" }
    const parsed = parseSettlementEvent(signedEvent)

    expect(validateSettlementEvent(parsed!)).toBe(false)
  })
})

describe("validateMemberEvent", () => {
  it("should return true when signed by owner", () => {
    const settlementId = generateSettlementId()
    const ownerPubkey = "owner_pubkey_hex"

    const unsigned = createMemberEvent({
      settlementId,
      ownerPubkey,
      members: [{ pubkey: "m1", name: "Member 1" }],
    })

    const signedEvent = { ...unsigned, id: "id", sig: "sig" }
    const parsed = parseMemberEvent(signedEvent)

    expect(validateMemberEvent(parsed!, ownerPubkey)).toBe(true)
  })

  it("should return false when not signed by owner", () => {
    const settlementId = generateSettlementId()
    const ownerPubkey = "owner_pubkey_hex"

    const unsigned = createMemberEvent({
      settlementId,
      ownerPubkey: "attacker_pubkey",
      members: [],
    })

    const signedEvent = { ...unsigned, id: "id", sig: "sig" }
    const parsed = parseMemberEvent(signedEvent)

    expect(validateMemberEvent(parsed!, ownerPubkey)).toBe(false)
  })
})

describe("validateExpenseEvent", () => {
  it("should return true for valid cap and member", async () => {
    const settlementId = generateSettlementId()
    const inviteToken = generateInviteToken()
    const actorPubkey = "actor_pubkey"
    const memberPubkey = "member_pubkey"

    const unsigned = await createExpenseEvent({
      settlementId,
      inviteToken,
      actorPubkey,
      memberPubkey,
      amount: 1000,
      currency: "JPY",
      note: "Test",
    })

    const signedEvent = { ...unsigned, id: "id", sig: "sig" }
    const parsed = parseExpenseEvent(signedEvent)
    const validMembers = [memberPubkey]

    expect(await validateExpenseEvent(parsed!, inviteToken, validMembers)).toEqual({
      isValid: true,
      capValid: true,
      memberValid: true,
    })
  })

  it("should return capValid=false for invalid cap", async () => {
    const settlementId = generateSettlementId()
    const inviteToken = generateInviteToken()
    const wrongToken = generateInviteToken()
    const actorPubkey = "actor_pubkey"
    const memberPubkey = "member_pubkey"

    const unsigned = await createExpenseEvent({
      settlementId,
      inviteToken,
      actorPubkey,
      memberPubkey,
      amount: 1000,
      currency: "JPY",
      note: "Test",
    })

    const signedEvent = { ...unsigned, id: "id", sig: "sig" }
    const parsed = parseExpenseEvent(signedEvent)
    const validMembers = [memberPubkey]

    // Validate with wrong token
    expect(await validateExpenseEvent(parsed!, wrongToken, validMembers)).toEqual({
      isValid: false,
      capValid: false,
      memberValid: true,
    })
  })

  it("should return memberValid=false for unknown member", async () => {
    const settlementId = generateSettlementId()
    const inviteToken = generateInviteToken()
    const actorPubkey = "actor_pubkey"
    const memberPubkey = "unknown_member"

    const unsigned = await createExpenseEvent({
      settlementId,
      inviteToken,
      actorPubkey,
      memberPubkey,
      amount: 1000,
      currency: "JPY",
      note: "Test",
    })

    const signedEvent = { ...unsigned, id: "id", sig: "sig" }
    const parsed = parseExpenseEvent(signedEvent)
    const validMembers = ["other_member"]

    expect(await validateExpenseEvent(parsed!, inviteToken, validMembers)).toEqual({
      isValid: false,
      capValid: true,
      memberValid: false,
    })
  })
})
