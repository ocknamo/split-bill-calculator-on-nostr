<script lang="ts">
  import { AlertTriangle, ArrowLeft, Receipt, Users } from 'lucide-svelte'
  import { onDestroy } from 'svelte'
  import { BtcPriceStore } from '$lib/stores/btc-price.svelte'
  import { generateInviteLink } from '$lib/nostr/settlement/settlement-sync.svelte'
  import { SettlementSync } from '$lib/nostr/settlement/settlement-sync.svelte'
  import { base } from '$app/paths'
  import { calculateSettlements } from '$lib/settlements'
  import { formatCurrency, fiatToSats, formatBtcPrice, getCurrencySymbol } from '$lib/utils/currency'
  import type { Currency, Expense, Member, Settlement } from '$lib/types/split-calculator'
  import type { SettlementState } from '$lib/nostr/settlement/state'
  import ExpenseForm from './ExpenseForm.svelte'
  import ExpenseList from './ExpenseList.svelte'
  import LightningPaymentModal from './LightningPaymentModal.svelte'
  import LockSettlementDialog from './LockSettlementDialog.svelte'
  import MemberList from './MemberList.svelte'
  import PriceFooter from './PriceFooter.svelte'
  import SettlementHeader from './SettlementHeader.svelte'
  import SettlementList from './SettlementList.svelte'

  interface Props {
    settlementId: string
    inviteToken: string
    onBack: () => void
    onNameResolved?: (name: string) => void
  }

  let { settlementId, inviteToken, onBack, onNameResolved }: Props = $props()

  // Capture props in closure to avoid stale reference warnings
  const sync = new SettlementSync({
    settlementId: settlementId,
    inviteToken: inviteToken,
  })
  const priceStore = new BtcPriceStore()

  $effect(() => {
    sync.init()
    priceStore.fetch()
  })

  onDestroy(() => sync.destroy())

  let paidIds = $state<string[]>([])
  const paidSettlements = $derived(new Set(paidIds))

  // Convert SettlementState → UI types
  const members = $derived(stateToMembers(sync.state))
  const expenses = $derived(stateToExpenses(sync.state))
  const settlementName = $derived(sync.state?.name ?? '精算')
  const isLocked = $derived(sync.state?.isLocked ?? false)
  const currency = $derived<Currency>((sync.state?.currency?.toLowerCase() as Currency) || 'jpy')

  let nameNotified = false
  $effect(() => {
    const name = sync.state?.name
    if (name && !nameNotified) {
      nameNotified = true
      onNameResolved?.(name)
    }
  })

  function stateToMembers(state: SettlementState | null): Member[] {
    if (!state?.members) return []
    return state.members.map((m) => ({
      id: m.pubkey,
      name: m.name,
      npub: m.pubkey,
      nostrProfile: m.picture || m.lud16 ? { name: m.name, picture: m.picture, lud16: m.lud16 } : undefined,
    }))
  }

  function stateToExpenses(state: SettlementState | null): Expense[] {
    if (!state?.expenses) return []
    return state.expenses.map((e) => ({
      id: e.eventId,
      description: e.note,
      amount: e.amount,
      paidById: e.memberPubkey,
      currency: ((e.currency?.toLowerCase() || 'jpy') as Currency),
      isCancelled: e.isCancelled,
    }))
  }

  const { totalAmount, perPerson, settlements } = $derived(
    calculateSettlements(members, expenses.filter((e) => !e.isCancelled))
  )

  function getMemberPaidTotal(memberId: string): number {
    return expenses
      .filter((e) => e.paidById === memberId && !e.isCancelled)
      .reduce((s, e) => s + e.amount, 0)
  }

  const inviteLink = $derived(
    typeof window !== 'undefined'
      ? generateInviteLink(settlementId, inviteToken, window.location.origin + base)
      : ''
  )

  const expensesForLock = $derived(
    expenses.map((e) => {
      const inv = sync.state?.invalidExpenses?.find((i) => i.event.id === e.id)
      const member = members.find((m) => m.id === e.paidById)
      return {
        id: e.id,
        description: e.description,
        amount: e.amount,
        memberName: member?.name ?? 'Unknown',
        isValid: !inv,
        invalidReason: inv?.reason,
      }
    })
  )

  let paymentModal = $state<{
    isOpen: boolean
    lud16: string
    recipientName: string
    recipientPicture?: string
    amount: number
  }>({ isOpen: false, lud16: '', recipientName: '', amount: 0 })

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
</script>

{#if sync.isLoading}
  <div class="flex min-h-[50vh] items-center justify-center">
    <p class="text-gray-400">読み込み中...</p>
  </div>
{:else}
  <div>
    <div class="mb-4">
      <button
        onclick={onBack}
        class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
      >
        <ArrowLeft class="h-4 w-4" />
        戻る
      </button>
    </div>

    <SettlementHeader
      name={settlementName}
      isOwner={sync.isOwner}
      {isLocked}
      {inviteLink}
      connectionStatus={sync.connectionStatus}
      onRefresh={() => sync.refresh()}
    />

    {#if sync.error}
      <div
        class="mb-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        <AlertTriangle class="h-4 w-4 shrink-0" />
        {sync.error}
      </div>
    {/if}

    {#if !isLocked}
      <MemberList
        {members}
        isOwner={sync.isOwner}
        onAddMember={(m) => sync.addMember(m.id, m.name, m.nostrProfile?.picture, m.nostrProfile?.lud16)}
        onRemoveMember={(id) => sync.removeMember(id)}
        formatCurrency={(a) => formatCurrency(a, currency)}
        {getMemberPaidTotal}
      />

      <ExpenseForm
        {members}
        {currency}
        currencySymbol={getCurrencySymbol(currency)}
        onAddExpense={(e) => sync.addExpense(e.paidById, e.amount, e.currency.toUpperCase(), e.description)}
      />
    {/if}

    <ExpenseList
      {expenses}
      {members}
      currentCurrency={currency}
      formatCurrency={(a) => formatCurrency(a, currency)}
      onRemoveExpense={isLocked ? () => {} : (id) => sync.removeExpense(id)}
      canRemoveExpense={isLocked ? () => false : (id) => sync.canRemoveExpense(id)}
    />

    {#if members.length > 0 && expenses.length > 0}
      <div
        class="mb-6 grid grid-cols-2 gap-4 rounded-xl border-2 border-gray-200 bg-white p-5 text-center"
      >
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-gray-400">合計金額</p>
          <p class="mt-1 text-2xl font-bold text-gray-900">
            {formatCurrency(totalAmount, currency)}
          </p>
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

    {#if sync.isOwner && !isLocked && expenses.length > 0}
      <div class="mt-6">
        <LockSettlementDialog
          expenses={expensesForLock}
          formatCurrency={(a) => formatCurrency(a, currency)}
          onLock={(ids) => sync.lockSettlement(ids)}
        />
      </div>
    {/if}

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
{/if}
