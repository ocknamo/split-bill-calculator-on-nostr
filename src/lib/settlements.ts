/**
 * Pure settlement calculation logic (framework-agnostic)
 * Extracted from React hook useSettlements for Svelte 5 migration
 */

import type { Expense, Member, Settlement } from "./types/split-calculator";

export interface SettlementsResult {
  totalAmount: number;
  perPerson: number;
  settlements: Settlement[];
  getMemberPaidTotal: (memberId: string) => number;
}

/**
 * Calculates who owes whom using a greedy minimum-payment algorithm.
 *
 * Algorithm:
 * 1. Calculate per-person share (total / members)
 * 2. Compute each member's balance (paid - share)
 * 3. Greedily match debtors to creditors until balanced
 * 4. Ignore differences < 0.01 (floating-point tolerance)
 */
export function calculateSettlements(members: Member[], expenses: Expense[]): SettlementsResult {
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const perPerson = members.length > 0 ? totalAmount / members.length : 0;

  // Pre-calculate paid totals for all members
  const memberPaidTotals: Record<string, number> = {};
  members.forEach((m) => {
    memberPaidTotals[m.id] = 0;
  });
  expenses.forEach((e) => {
    if (memberPaidTotals[e.paidById] !== undefined) {
      memberPaidTotals[e.paidById] += e.amount;
    }
  });

  const settlements = computeSettlements(members, memberPaidTotals, perPerson);

  return {
    totalAmount,
    perPerson,
    settlements,
    getMemberPaidTotal: (memberId: string) => memberPaidTotals[memberId] ?? 0,
  };
}

function computeSettlements(
  members: Member[],
  memberPaidTotals: Record<string, number>,
  perPerson: number,
): Settlement[] {
  if (members.length < 2 || Object.values(memberPaidTotals).every((v) => v === 0)) return [];

  const balances: { id: string; balance: number }[] = members.map((m) => ({
    id: m.id,
    balance: (memberPaidTotals[m.id] ?? 0) - perPerson,
  }));

  const result: Settlement[] = [];
  const creditors = balances.filter((b) => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter((b) => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.balance, -debtor.balance);

    if (amount > 0) {
      result.push({
        id: `${debtor.id}-${creditor.id}`,
        from: debtor.id,
        to: creditor.id,
        amount: Math.round(amount),
      });
    }

    creditor.balance -= amount;
    debtor.balance += amount;

    if (creditor.balance < 0.01) i++;
    if (debtor.balance > -0.01) j++;
  }

  return result;
}
