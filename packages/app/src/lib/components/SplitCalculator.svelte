<script lang="ts">
  import { Receipt, Users } from 'lucide-svelte'
  import { BtcPriceStore } from '$lib/stores/btc-price.svelte'
  import { formatCurrency, fiatToSats, formatBtcPrice, getCurrencySymbol } from '$lib/utils/currency'
  import { calculateSettlements } from '$lib/settlements'
  import type { Currency, Expense, Member, Settlement } from '$lib/types/split-calculator'
  import CurrencySwitcher from './CurrencySwitcher.svelte'
  import ExpenseForm from './ExpenseForm.svelte'
  import ExpenseList from './ExpenseList.svelte'
  import LightningPaymentModal from './LightningPaymentModal.svelte'
  import MemberList from './MemberList.svelte'
  import PriceFooter from './PriceFooter.svelte'
  import SettlementList from './SettlementList.svelte'

  // Persisted state via localStorage
  function loadStorage<T>(key: string, fallback: T): T {
    try {
      const v = sessionStorage.getItem(key)
      return v ? (JSON.parse(v) as T) : fallback
    } catch {
      return fallback
    }
  }

  function saveStorage<T>(key: string, value: T) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }

  let members = $state<Member[]>(loadStorage('members', []))
  let expenses = $state<Expense[]>(loadStorage('expenses', []))
  let paidIds = $state<string[]>(loadStorage('paidSettlements', []))
  let currency = $state<Currency>(loadStorage('currency', 'jpy'))

  const paidSettlements = $derived(new Set(paidIds))

  $effect(() => saveStorage('members', members))
  $effect(() => saveStorage('expenses', expenses))
  $effect(() => saveStorage('paidSettlements', paidIds))
  $effect(() => saveStorage('currency', currency))

  const priceStore = new BtcPriceStore()
  $effect(() => {
    priceStore.fetch()
  })

  const { totalAmount, perPerson, settlements } = $derived(
    calculateSettlements(members, expenses)
  )

  function getMemberPaidTotal(memberId: string): number {
    return expenses.filter((e) => e.paidById === memberId).reduce((s, e) => s + e.amount, 0)
  }

  const mixedCurrencyWarning = $derived(() => {
    if (expenses.length === 0) return null
    const currencies = new Set(expenses.map((e) => e.currency))
    if (currencies.size > 1) {
      const jpyCount = expenses.filter((e) => e.currency === 'jpy').length
      const usdCount = expenses.filter((e) => e.currency === 'usd').length
      return `支出に複数の通貨が混在しています (JPY: ${jpyCount}件, USD: ${usdCount}件)`
    }
    return null
  })

  let paymentModal = $state<{
    isOpen: boolean
    lud16: string
    recipientName: string
    recipientPicture?: string
    amount: number
  }>({ isOpen: false, lud16: '', recipientName: '', amount: 0 })

  function handleAddMember(member: Member) {
    members = [...members, member]
  }

  function handleRemoveMember(id: string) {
    members = members.filter((m) => m.id !== id)
    expenses = expenses.filter((e) => e.paidById !== id)
    paidIds = paidIds.filter((sid) => !sid.includes(id))
  }

  function handleAddExpense(expense: Expense) {
    expenses = [...expenses, expense]
  }

  function handleRemoveExpense(id: string) {
    expenses = expenses.filter((e) => e.id !== id)
  }

  function handleTogglePaid(id: string) {
    paidIds = paidIds.includes(id) ? paidIds.filter((s) => s !== id) : [...paidIds, id]
  }

  function handleOpenLightning(settlement: Settlement) {
    const recipient = members.find((m) => m.id === settlement.to)
    if (recipient?.nostrProfile?.lud16) {
      paymentModal = {
        isOpen: true,
        lud16: recipient.nostrProfile.lud16,
        recipientName: recipient.name,
        recipientPicture: recipient.nostrProfile.picture,
        amount: fiatToSats(settlement.amount, priceStore.price, currency),
      }
    }
  }

  function handleReset() {
    members = []
    expenses = []
    paidIds = []
    try {
      sessionStorage.clear()
    } catch {}
  }
</script>

<div>
  {#if mixedCurrencyWarning()}
    <div class="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      {mixedCurrencyWarning()}
    </div>
  {/if}

  <MemberList
    {members}
    onAddMember={handleAddMember}
    onRemoveMember={handleRemoveMember}
    formatCurrency={(a) => formatCurrency(a, currency)}
    {getMemberPaidTotal}
  />

  <ExpenseForm
    {members}
    {currency}
    currencySymbol={getCurrencySymbol(currency)}
    onAddExpense={handleAddExpense}
  />

  <ExpenseList
    {expenses}
    {members}
    currentCurrency={currency}
    formatCurrency={(a) => formatCurrency(a, currency)}
    onRemoveExpense={handleRemoveExpense}
  />

  {#if members.length > 0 && expenses.length > 0}
    <div class="mb-6 grid grid-cols-2 gap-4 rounded-xl border-2 border-gray-200 bg-white p-5 text-center">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">合計金額</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalAmount, currency)}</p>
      </div>
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-gray-400">1人あたり</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">
          {formatCurrency(Math.round(perPerson), currency)}
        </p>
      </div>
    </div>
  {/if}

  <SettlementList
    {settlements}
    {members}
    {paidSettlements}
    formatCurrency={(a) => formatCurrency(a, currency)}
    fiatToSats={(a) => fiatToSats(a, priceStore.price, currency)}
    onTogglePaid={handleTogglePaid}
    onOpenLightningPayment={handleOpenLightning}
  />

  {#if members.length === 0}
    <div
      class="mb-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-12"
    >
      <Users class="h-12 w-12 text-gray-200" />
      <p class="mt-4 text-gray-400">まずメンバーを追加してください</p>
    </div>
  {:else if expenses.length === 0}
    <div
      class="mb-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-12"
    >
      <Receipt class="h-12 w-12 text-gray-200" />
      <p class="mt-4 text-gray-400">支出を追加すると精算結果が表示されます</p>
    </div>
  {/if}

  {#if members.length > 0 || expenses.length > 0}
    <div class="mt-4 text-center">
      <button
        onclick={handleReset}
        class="rounded-lg border-2 border-gray-200 px-4 py-2 text-sm text-gray-500 hover:border-red-300 hover:text-red-500"
      >
        すべてリセット
      </button>
    </div>
  {/if}

  <div class="mt-6 flex justify-center">
    <CurrencySwitcher {currency} onCurrencyChange={(c) => (currency = c)} />
  </div>

  <PriceFooter
    formattedBtcPrice={formatBtcPrice(priceStore.price, currency)}
    loading={priceStore.loading}
    error={priceStore.error}
    rateLimited={priceStore.rateLimited}
    onRefresh={() => priceStore.fetch(true)}
  />
</div>

<LightningPaymentModal
  isOpen={paymentModal.isOpen}
  onClose={() => (paymentModal = { ...paymentModal, isOpen: false })}
  lud16={paymentModal.lud16}
  recipientName={paymentModal.recipientName}
  recipientPicture={paymentModal.recipientPicture}
  suggestedAmount={paymentModal.amount}
  {currency}
  btcPrice={priceStore.price}
/>
