import type { Expense, Member, Settlement } from '$lib/types/split-calculator'

export interface SettlementsResult {
  totalAmount: number
  perPerson: number
  settlements: Settlement[]
  memberPaidTotals: Record<string, number>
}

/**
 * 割り勘計算の純粋関数
 * [H1] 精算金額は Math.round() で整数に丸める
 */
export function calculateSettlements(members: Member[], expenses: Expense[]): SettlementsResult {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
  const perPerson = members.length > 0 ? totalAmount / members.length : 0

  const memberPaidTotals: Record<string, number> = {}
  for (const m of members) memberPaidTotals[m.id] = 0
  for (const e of expenses) {
    if (memberPaidTotals[e.paidById] !== undefined) {
      memberPaidTotals[e.paidById] += e.amount
    }
  }

  const settlements: Settlement[] = []
  if (members.length >= 2 && expenses.length > 0) {
    const balances = members.map((m) => ({
      id: m.id,
      balance: (memberPaidTotals[m.id] ?? 0) - perPerson,
    }))

    const creditors = balances.filter((b) => b.balance > 0.01).sort((a, b) => b.balance - a.balance)
    const debtors = balances.filter((b) => b.balance < -0.01).sort((a, b) => a.balance - b.balance)

    let i = 0
    let j = 0
    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i]
      const debtor = debtors[j]
      const amount = Math.min(creditor.balance, -debtor.balance)

      if (amount > 0.01) {
        settlements.push({
          id: `${debtor.id}-${creditor.id}`,
          from: debtor.id,
          to: creditor.id,
          amount: Math.round(amount), // [H1] 整数に丸める
        })
      }

      creditor.balance -= amount
      debtor.balance += amount
      if (creditor.balance < 0.01) i++
      if (debtor.balance > -0.01) j++
    }
  }

  return { totalAmount, perPerson, settlements, memberPaidTotals }
}
