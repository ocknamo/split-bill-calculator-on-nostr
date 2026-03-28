import { describe, expect, it } from 'vitest'
import { calculateSettlements } from './settlements'
import type { Expense, Member } from './types/split-calculator'

const makeMembers = (count: number): Member[] =>
  Array.from({ length: count }, (_, i) => ({ id: `m${i + 1}`, name: `Member ${i + 1}` }))

const makeExpense = (id: string, paidById: string, amount: number): Expense => ({
  id,
  description: 'test',
  amount,
  paidById,
  currency: 'jpy',
})

describe('calculateSettlements', () => {
  it('空のメンバー・支出で空の結果を返す', () => {
    const result = calculateSettlements([], [])
    expect(result.totalAmount).toBe(0)
    expect(result.perPerson).toBe(0)
    expect(result.settlements).toHaveLength(0)
  })

  it('メンバーのみ・支出なしで精算なし', () => {
    const result = calculateSettlements(makeMembers(3), [])
    expect(result.totalAmount).toBe(0)
    expect(result.settlements).toHaveLength(0)
  })

  it('2人で均等割り: 一方が全額払った場合', () => {
    const members = makeMembers(2)
    const expenses = [makeExpense('e1', 'm1', 1000)]
    const result = calculateSettlements(members, expenses)

    expect(result.totalAmount).toBe(1000)
    expect(result.perPerson).toBe(500)
    expect(result.settlements).toHaveLength(1)
    expect(result.settlements[0].from).toBe('m2')
    expect(result.settlements[0].to).toBe('m1')
    expect(result.settlements[0].amount).toBe(500)
  })

  it('3人の場合の複数精算', () => {
    const members = makeMembers(3)
    // m1 が 3000 円払った: 各 1000 円負担
    // m2 が 0 円: m1 に 1000 円
    // m3 が 0 円: m1 に 1000 円
    const expenses = [makeExpense('e1', 'm1', 3000)]
    const result = calculateSettlements(members, expenses)

    expect(result.totalAmount).toBe(3000)
    expect(result.perPerson).toBe(1000)
    expect(result.settlements).toHaveLength(2)
    const fromM2 = result.settlements.find((s) => s.from === 'm2')
    const fromM3 = result.settlements.find((s) => s.from === 'm3')
    expect(fromM2?.to).toBe('m1')
    expect(fromM2?.amount).toBe(1000)
    expect(fromM3?.to).toBe('m1')
    expect(fromM3?.amount).toBe(1000)
  })

  it('複数人が払った場合の最適精算', () => {
    const members = makeMembers(3)
    // m1: 2000, m2: 1000, m3: 0 → 合計 3000, 一人 1000
    // m1 balance: +1000 (creditor), m2 balance: 0, m3 balance: -1000 (debtor)
    const expenses = [
      makeExpense('e1', 'm1', 2000),
      makeExpense('e2', 'm2', 1000),
    ]
    const result = calculateSettlements(members, expenses)

    expect(result.totalAmount).toBe(3000)
    expect(result.settlements).toHaveLength(1)
    expect(result.settlements[0].from).toBe('m3')
    expect(result.settlements[0].to).toBe('m1')
    expect(result.settlements[0].amount).toBe(1000)
  })

  it('[H1] 精算金額が Math.round() で整数になる', () => {
    const members = makeMembers(3)
    // 1000 ÷ 3 = 333.333...: 切り捨て後に整数
    const expenses = [makeExpense('e1', 'm1', 1000)]
    const result = calculateSettlements(members, expenses)

    for (const s of result.settlements) {
      expect(s.amount).toBe(Math.round(s.amount))
      expect(Number.isInteger(s.amount)).toBe(true)
    }
  })

  it('memberPaidTotals が各メンバーの支払い合計を返す', () => {
    const members = makeMembers(2)
    const expenses = [
      makeExpense('e1', 'm1', 600),
      makeExpense('e2', 'm1', 400),
      makeExpense('e3', 'm2', 200),
    ]
    const result = calculateSettlements(members, expenses)

    expect(result.memberPaidTotals['m1']).toBe(1000)
    expect(result.memberPaidTotals['m2']).toBe(200)
  })

  it('既に均等割りの場合は精算不要', () => {
    const members = makeMembers(2)
    const expenses = [
      makeExpense('e1', 'm1', 500),
      makeExpense('e2', 'm2', 500),
    ]
    const result = calculateSettlements(members, expenses)
    expect(result.settlements).toHaveLength(0)
  })
})
