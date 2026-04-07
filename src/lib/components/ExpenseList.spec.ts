import { render, screen, cleanup } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ExpenseList from './ExpenseList.svelte'
import type { Expense, Member } from '$lib/types/split-calculator'

const members: Member[] = [
  { id: 'member-1', name: 'Alice' },
  { id: 'member-2', name: 'Bob' },
]

const expenses: Expense[] = [
  { id: 'exp-1', description: 'ランチ', amount: 1000, paidById: 'member-1', currency: 'jpy' },
  { id: 'exp-2', description: 'ディナー', amount: 2000, paidById: 'member-2', currency: 'jpy' },
]

const defaultProps = {
  expenses,
  members,
  currentCurrency: 'jpy' as const,
  formatCurrency: (a: number) => `¥${a}`,
  onRemoveExpense: vi.fn(),
}

describe('ExpenseList - 削除ボタンの表示制御', () => {
  afterEach(() => {
    cleanup()
  })

  it('canRemoveExpenseが未指定の場合、全ての支出に削除ボタンが表示される', () => {
    render(ExpenseList, { props: defaultProps })

    const deleteButtons = screen.getAllByRole('button', { name: /を削除$/ })
    expect(deleteButtons).toHaveLength(2)
  })

  it('canRemoveExpenseがfalseを返す支出には削除ボタンが表示されない', () => {
    render(ExpenseList, {
      props: {
        ...defaultProps,
        canRemoveExpense: (id: string) => id === 'exp-1',
      },
    })

    const deleteButtons = screen.getAllByRole('button', { name: /を削除$/ })
    expect(deleteButtons).toHaveLength(1)
    expect(deleteButtons[0]).toHaveAttribute('aria-label', 'ランチを削除')
  })

  it('canRemoveExpenseが全てfalseの場合、削除ボタンが一つも表示されない', () => {
    render(ExpenseList, {
      props: {
        ...defaultProps,
        canRemoveExpense: () => false,
      },
    })

    const deleteButtons = screen.queryAllByRole('button', { name: /を削除$/ })
    expect(deleteButtons).toHaveLength(0)
  })

  it('キャンセル済みの支出には削除ボタンが表示されない', () => {
    const cancelledExpenses: Expense[] = [
      { id: 'exp-1', description: 'ランチ', amount: 1000, paidById: 'member-1', currency: 'jpy', isCancelled: true },
      { id: 'exp-2', description: 'ディナー', amount: 2000, paidById: 'member-2', currency: 'jpy' },
    ]

    render(ExpenseList, {
      props: {
        ...defaultProps,
        expenses: cancelledExpenses,
        canRemoveExpense: () => true,
      },
    })

    const deleteButtons = screen.getAllByRole('button', { name: /を削除$/ })
    expect(deleteButtons).toHaveLength(1)
    expect(deleteButtons[0]).toHaveAttribute('aria-label', 'ディナーを削除')
  })

  it('キャンセル済みかつcanRemoveExpenseがtrueでも削除ボタンは表示されない', () => {
    const allCancelledExpenses: Expense[] = [
      { id: 'exp-1', description: 'ランチ', amount: 1000, paidById: 'member-1', currency: 'jpy', isCancelled: true },
    ]

    render(ExpenseList, {
      props: {
        ...defaultProps,
        expenses: allCancelledExpenses,
        canRemoveExpense: () => true,
      },
    })

    const deleteButtons = screen.queryAllByRole('button', { name: /を削除$/ })
    expect(deleteButtons).toHaveLength(0)
  })
})
