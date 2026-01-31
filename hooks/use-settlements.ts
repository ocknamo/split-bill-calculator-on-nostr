'use client'

import { useCallback, useMemo } from 'react'
import type { Expense, Member, Settlement } from '@/types/split-calculator'

export function useSettlements(members: Member[], expenses: Expense[]) {
  const totalAmount = useMemo(() => expenses.reduce((sum, exp) => sum + exp.amount, 0), [expenses])

  const perPerson = useMemo(
    () => (members.length > 0 ? totalAmount / members.length : 0),
    [totalAmount, members.length]
  )

  // Pre-calculate paid totals for all members
  const memberPaidTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    members.forEach((m) => {
      totals[m.id] = 0
    })
    expenses.forEach((e) => {
      if (totals[e.paidById] !== undefined) {
        totals[e.paidById] += e.amount
      }
    })
    return totals
  }, [members, expenses])

  const settlements = useMemo((): Settlement[] => {
    if (members.length < 2 || expenses.length === 0) return []

    const balances: { id: string; balance: number }[] = members.map((m) => ({
      id: m.id,
      balance: (memberPaidTotals[m.id] || 0) - perPerson,
    }))

    const result: Settlement[] = []
    const creditors = balances.filter((b) => b.balance > 0.01).sort((a, b) => b.balance - a.balance)
    const debtors = balances.filter((b) => b.balance < -0.01).sort((a, b) => a.balance - b.balance)

    let i = 0
    let j = 0
    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i]
      const debtor = debtors[j]
      const amount = Math.min(creditor.balance, -debtor.balance)

      if (amount > 0) {
        result.push({
          id: `${debtor.id}-${creditor.id}`,
          from: debtor.id,
          to: creditor.id,
          amount: Math.round(amount),
        })
      }

      creditor.balance -= amount
      debtor.balance += amount

      if (creditor.balance < 0.01) i++
      if (debtor.balance > -0.01) j++
    }

    return result
  }, [members, expenses, memberPaidTotals, perPerson])

  // Memoized callback that uses pre-calculated totals
  const getMemberPaidTotal = useCallback(
    (memberId: string) => memberPaidTotals[memberId] || 0,
    [memberPaidTotals]
  )

  return {
    totalAmount,
    perPerson,
    settlements,
    getMemberPaidTotal,
  }
}
