import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('$app/environment', () => ({ browser: false }))

describe('calculatorStore', () => {
  beforeEach(async () => {
    vi.resetModules()
  })

  it('初期状態: members=[], expenses=[], currency=jpy', async () => {
    const { calculatorStore } = await import('./calculator.svelte')
    expect(calculatorStore.members).toEqual([])
    expect(calculatorStore.expenses).toEqual([])
    expect(calculatorStore.currency).toBe('jpy')
  })

  it('addMember でメンバーを追加できる', async () => {
    const { calculatorStore } = await import('./calculator.svelte')
    calculatorStore.addMember('アリス')
    expect(calculatorStore.members).toHaveLength(1)
    expect(calculatorStore.members[0].name).toBe('アリス')
  })

  it('[H4] addMember で空の名前はエラーをスロー', async () => {
    const { calculatorStore } = await import('./calculator.svelte')
    expect(() => calculatorStore.addMember('')).toThrow()
    expect(() => calculatorStore.addMember('  ')).toThrow()
  })

  it('removeMember でメンバーを削除できる', async () => {
    const { calculatorStore } = await import('./calculator.svelte')
    calculatorStore.addMember('アリス')
    const id = calculatorStore.members[0].id
    calculatorStore.removeMember(id)
    expect(calculatorStore.members).toHaveLength(0)
  })

  it('removeMember でそのメンバーの支出も削除される', async () => {
    const { calculatorStore } = await import('./calculator.svelte')
    calculatorStore.addMember('アリス')
    const member = calculatorStore.members[0]
    calculatorStore.addExpense({ description: 'ランチ', amount: 1000, paidById: member.id, currency: 'jpy' })
    calculatorStore.removeMember(member.id)
    expect(calculatorStore.expenses).toHaveLength(0)
  })

  it('addExpense で支出を追加できる', async () => {
    const { calculatorStore } = await import('./calculator.svelte')
    calculatorStore.addMember('アリス')
    const member = calculatorStore.members[0]
    calculatorStore.addExpense({ description: 'ランチ', amount: 1000, paidById: member.id, currency: 'jpy' })
    expect(calculatorStore.expenses).toHaveLength(1)
    expect(calculatorStore.expenses[0].amount).toBe(1000)
  })

  it('[H4] addExpense で amount <= 0 はエラーをスロー', async () => {
    const { calculatorStore } = await import('./calculator.svelte')
    calculatorStore.addMember('アリス')
    const member = calculatorStore.members[0]
    expect(() =>
      calculatorStore.addExpense({ description: 'テスト', amount: 0, paidById: member.id, currency: 'jpy' })
    ).toThrow()
    expect(() =>
      calculatorStore.addExpense({ description: 'テスト', amount: -100, paidById: member.id, currency: 'jpy' })
    ).toThrow()
  })

  it('removeExpense で支出を削除できる', async () => {
    const { calculatorStore } = await import('./calculator.svelte')
    calculatorStore.addMember('アリス')
    const member = calculatorStore.members[0]
    calculatorStore.addExpense({ description: 'ランチ', amount: 1000, paidById: member.id, currency: 'jpy' })
    const expId = calculatorStore.expenses[0].id
    calculatorStore.removeExpense(expId)
    expect(calculatorStore.expenses).toHaveLength(0)
  })

  it('settlements は calculateSettlements の結果と一致する', async () => {
    const { calculatorStore } = await import('./calculator.svelte')
    calculatorStore.addMember('アリス')
    calculatorStore.addMember('ボブ')
    const alice = calculatorStore.members[0]
    calculatorStore.addExpense({ description: 'ランチ', amount: 1000, paidById: alice.id, currency: 'jpy' })
    expect(calculatorStore.settlements.settlements).toHaveLength(1)
    expect(calculatorStore.settlements.settlements[0].amount).toBe(500)
    expect(calculatorStore.settlements.settlements[0].from).toBe(calculatorStore.members[1].id)
    expect(calculatorStore.settlements.settlements[0].to).toBe(alice.id)
  })

  it('reset でメンバーと支出がクリアされる', async () => {
    const { calculatorStore } = await import('./calculator.svelte')
    calculatorStore.addMember('アリス')
    calculatorStore.reset()
    expect(calculatorStore.members).toHaveLength(0)
    expect(calculatorStore.expenses).toHaveLength(0)
  })
})
