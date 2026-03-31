import { describe, expect, it } from "vitest";
import { calculateSettlements } from "./settlements";
import type { Expense, Member, Settlement } from "./types/split-calculator";

describe("calculateSettlements", () => {
  const makeMembers = (...names: string[]): Member[] =>
    names.map((name, i) => ({ id: `m${i + 1}`, name }));

  const makeExpense = (id: string, paidById: string, amount: number): Expense => ({
    id,
    description: "test",
    amount,
    paidById,
    currency: "jpy",
  });

  it("should return empty array for 0 or 1 member", () => {
    expect(calculateSettlements([], []).settlements).toEqual([]);
    expect(calculateSettlements(makeMembers("Alice"), []).settlements).toEqual([]);
  });

  it("should return empty array when no expenses", () => {
    const members = makeMembers("Alice", "Bob");
    expect(calculateSettlements(members, []).settlements).toEqual([]);
  });

  it("should calculate even split for 2 members", () => {
    // Alice paid 1000, Bob paid nothing
    // perPerson = 500, Alice overpaid by 500, Bob underpaid by 500
    const members = makeMembers("Alice", "Bob");
    const expenses = [makeExpense("e1", "m1", 1000)];

    const { settlements } = calculateSettlements(members, expenses);

    expect(settlements).toHaveLength(1);
    expect(settlements[0].from).toBe("m2"); // Bob pays
    expect(settlements[0].to).toBe("m1"); // Alice receives
    expect(settlements[0].amount).toBe(500);
  });

  it("should calculate even split for 3 members", () => {
    // Alice paid 3000 total
    // perPerson = 1000, Alice +2000, Bob -1000, Carol -1000
    const members = makeMembers("Alice", "Bob", "Carol");
    const expenses = [makeExpense("e1", "m1", 3000)];

    const { settlements } = calculateSettlements(members, expenses);

    expect(settlements).toHaveLength(2);
    const totalPaid = settlements.reduce((s, t) => s + t.amount, 0);
    expect(totalPaid).toBe(2000); // Bob + Carol each pay 1000
  });

  it("should handle multiple expenses from different payers", () => {
    // Alice paid 600, Bob paid 400, perPerson = 500
    // Alice +100, Bob -100 → Bob pays Alice 100
    const members = makeMembers("Alice", "Bob");
    const expenses = [makeExpense("e1", "m1", 600), makeExpense("e2", "m2", 400)];

    const { settlements } = calculateSettlements(members, expenses);

    expect(settlements).toHaveLength(1);
    expect(settlements[0].from).toBe("m2");
    expect(settlements[0].to).toBe("m1");
    expect(settlements[0].amount).toBe(100);
  });

  it("should return empty settlements when all paid equally", () => {
    // Each paid 500, perPerson = 500
    const members = makeMembers("Alice", "Bob");
    const expenses = [makeExpense("e1", "m1", 500), makeExpense("e2", "m2", 500)];

    const { settlements } = calculateSettlements(members, expenses);

    expect(settlements).toHaveLength(0);
  });

  it("should calculate correct totalAmount", () => {
    const members = makeMembers("Alice", "Bob");
    const expenses = [makeExpense("e1", "m1", 300), makeExpense("e2", "m2", 700)];

    const { totalAmount } = calculateSettlements(members, expenses);

    expect(totalAmount).toBe(1000);
  });

  it("should calculate correct perPerson", () => {
    const members = makeMembers("Alice", "Bob", "Carol");
    const expenses = [makeExpense("e1", "m1", 900)];

    const { perPerson } = calculateSettlements(members, expenses);

    expect(perPerson).toBe(300);
  });

  it("should return correct getMemberPaidTotal", () => {
    const members = makeMembers("Alice", "Bob");
    const expenses = [makeExpense("e1", "m1", 600), makeExpense("e2", "m1", 200)];

    const { getMemberPaidTotal } = calculateSettlements(members, expenses);

    expect(getMemberPaidTotal("m1")).toBe(800);
    expect(getMemberPaidTotal("m2")).toBe(0);
  });

  it("should minimize number of transactions (greedy algorithm)", () => {
    // 4 members: Alice paid 400, Bob paid 300, Carol paid 200, Dave paid 100
    // Total = 1000, perPerson = 250
    // Alice +150, Bob +50, Carol -50, Dave -150
    const members = makeMembers("Alice", "Bob", "Carol", "Dave");
    const expenses = [
      makeExpense("e1", "m1", 400),
      makeExpense("e2", "m2", 300),
      makeExpense("e3", "m3", 200),
      makeExpense("e4", "m4", 100),
    ];

    const { settlements } = calculateSettlements(members, expenses);

    // Verify each member's effective cost = perPerson = 250
    // effectiveCost = expenses_paid + settlement_payments - settlement_receipts
    const effectiveCost: Record<string, number> = {};
    members.forEach((m) => (effectiveCost[m.id] = 0));
    expenses.forEach((e) => (effectiveCost[e.paidById] += e.amount));
    settlements.forEach((s: Settlement) => {
      effectiveCost[s.from] += s.amount; // debtor pays extra
      effectiveCost[s.to] -= s.amount; // creditor gets reimbursed
    });

    members.forEach((m) => {
      expect(Math.abs(effectiveCost[m.id] - 250)).toBeLessThan(1);
    });
  });
});
