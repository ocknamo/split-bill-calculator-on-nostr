import { calculateSettlements, type SettlementsResult } from '$lib/settlements'
import type { Currency, Expense, Member } from '$lib/types/split-calculator'

function generateId(): string {
  return crypto.randomUUID()
}

function createCalculatorStore() {
  let members = $state<Member[]>([])
  let expenses = $state<Expense[]>([])
  let currency = $state<Currency>('jpy')

  function addMember(name: string): void {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('メンバー名を入力してください')
    members = [...members, { id: generateId(), name: trimmed }]
  }

  function removeMember(id: string): void {
    members = members.filter((m) => m.id !== id)
    expenses = expenses.filter((e) => e.paidById !== id)
  }

  function updateMember(id: string, updates: Partial<Member>): void {
    members = members.map((m) => (m.id === id ? { ...m, ...updates } : m))
  }

  function addExpense(input: {
    description: string
    amount: number
    paidById: string
    currency: Currency
  }): void {
    if (input.amount <= 0) throw new Error('金額は0より大きい値を入力してください')
    expenses = [...expenses, { id: generateId(), ...input }]
  }

  function removeExpense(id: string): void {
    expenses = expenses.filter((e) => e.id !== id)
  }

  function updateExpense(id: string, updates: Partial<Expense>): void {
    expenses = expenses.map((e) => (e.id === id ? { ...e, ...updates } : e))
  }

  function reset(): void {
    members = []
    expenses = []
  }

  return {
    get members() {
      return members
    },
    get expenses() {
      return expenses
    },
    get currency() {
      return currency
    },
    set currency(v: Currency) {
      currency = v
    },
    get settlements(): SettlementsResult {
      return calculateSettlements(members, expenses)
    },
    addMember,
    removeMember,
    updateMember,
    addExpense,
    removeExpense,
    updateExpense,
    reset,
  }
}

export const calculatorStore = createCalculatorStore()
