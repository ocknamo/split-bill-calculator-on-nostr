<script lang="ts">
  import { SettlementSync, generateInviteLink, parseInviteLink, createSettlement } from '$lib/stores/settlement-sync.svelte'
  import { btcPriceStore } from '$lib/stores/btc-price.svelte'
  import ExpenseForm from './expense-form.svelte'
  import ExpenseList from './expense-list.svelte'
  import SettlementList from './settlement-list.svelte'
  import MemberList from './member-list.svelte'
  import CurrencySwitcher from './currency-switcher.svelte'
  import SyncStatusIndicator from './sync-status-indicator.svelte'
  import SettlementHeader from './settlement-header.svelte'
  import LockSettlementDialog from './lock-settlement-dialog.svelte'
  import CreateSettlementDialog from './create-settlement-dialog.svelte'
  import LightningPaymentModal from './lightning-payment-modal.svelte'
  import PriceFooter from './price-footer.svelte'
  import { generateSettlementId } from '$lib/nostr/settlement/id'
  import { DEFAULT_RELAYS } from '$lib/constants'
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { calculateSettlements } from '$lib/settlements'
  import type { Currency } from '$lib/types/split-calculator'

  let { initialSettlementId = null, initialInviteToken = null }: {
    initialSettlementId?: string | null
    initialInviteToken?: string | null
  } = $props()

  // svelte-ignore state_referenced_locally
  let settlementId = $state<string | null>(initialSettlementId)
  // svelte-ignore state_referenced_locally
  let inviteToken = $state<string | null>(initialInviteToken)
  let sync = $state<SettlementSync | null>(null)
  let currency = $state<Currency>('jpy')
  let showCreateDialog = $state(false)
  let showLockDialog = $state(false)
  let lightningPayTarget = $state<{ fromMemberId: string; toMemberId: string; amount: number } | null>(null)
  let baseUrl = $state(browser ? window.location.origin + window.location.pathname : '')

  $effect(() => {
    if (settlementId && inviteToken) {
      sync = new SettlementSync({ settlementId, inviteToken })
    }
  })

  $effect(() => {
    btcPriceStore.fetchBtcPrice()
  })

  const syncMembers = $derived(
    (sync?.state?.members ?? []).map(m => ({
      id: m.pubkey,
      name: m.name ?? m.pubkey.slice(0, 8),
      npub: undefined,
      nostrProfile: m.picture ? { picture: m.picture, lud16: m.lud16 } : undefined,
    }))
  )

  const syncExpenses = $derived(
    (sync?.state?.expenses ?? []).map(e => ({
      id: e.eventId,
      description: e.note,
      amount: e.amount,
      paidById: e.memberPubkey,
      currency: (e.currency as Currency) ?? 'jpy',
    }))
  )

  async function handleCreate(name: string, cur: Currency) {
    const sid = generateSettlementId()
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    await createSettlement({ settlementId: sid, inviteToken: token, name, currency: cur, relays: [...DEFAULT_RELAYS] })
    settlementId = sid
    inviteToken = token
    showCreateDialog = false
    if (browser) {
      const url = new URL(window.location.href)
      url.searchParams.set('s', sid)
      url.searchParams.set('t', token)
      window.history.pushState({}, '', url.toString())
    }
  }

  async function handleAddMember(name: string) {
    if (!sync) return
    throw new Error('同期モードでは npub を入力してメンバーを追加してください')
  }
</script>

<div class="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col">
  {#if !settlementId || !inviteToken}
    <!-- No session state -->
    <div class="flex-1 flex flex-col items-center justify-center gap-6 px-4">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          ワリカンさん (同期モード)
        </h1>
        <p class="text-gray-500 dark:text-gray-400 text-sm">
          セッションがありません
        </p>
      </div>
      <button
        type="button"
        onclick={() => { showCreateDialog = true }}
        class="rounded-xl bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 text-sm font-semibold transition-colors shadow-sm"
      >
        新しいセッションを作成
      </button>
    </div>
  {:else}
    <!-- Header -->
    <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
      <div class="max-w-lg mx-auto px-4 py-3 flex flex-col gap-2">
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1 min-w-0">
            <SettlementHeader
              settlementName={sync?.state?.name ?? 'Loading...'}
              settlementId={settlementId}
              inviteToken={inviteToken}
              baseUrl={baseUrl}
            />
          </div>
          <CurrencySwitcher
            currency={currency}
            oncurrencychange={(c) => { currency = c }}
          />
        </div>
        <div class="flex items-center gap-2">
          {#if sync}
            <SyncStatusIndicator status={sync.connectionStatus} />
          {/if}
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 max-w-lg mx-auto w-full px-4 py-5 flex flex-col gap-4">
      {#if sync?.isLoading}
        <div class="flex items-center justify-center py-12">
          <svg class="animate-spin w-8 h-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      {/if}

      {#if sync?.error}
        <div class="rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-3">
          <p class="text-sm font-medium text-red-800 dark:text-red-300">
            エラー: {sync.error}
          </p>
        </div>
      {/if}

      <!-- Card: Members -->
      <section class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          メンバー
        </h2>
        <MemberList
          members={syncMembers}
          isOwner={sync?.isOwner ?? false}
          onadd={handleAddMember}
          onremove={async () => {}}
        />
      </section>

      <!-- Card: Add expense -->
      <section class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          支出を追加
        </h2>
        <ExpenseForm
          members={syncMembers}
          currency={currency}
          onadd={async (e) => {
            if (sync) await sync.addExpense(e.paidById, e.amount, e.currency, e.description)
          }}
        />
      </section>

      <!-- Card: Expense list -->
      <section class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          支出一覧
        </h2>
        <ExpenseList
          expenses={syncExpenses}
          members={syncMembers}
          currency={currency}
          btcPrice={btcPriceStore.btcPrice}
          onremove={() => {}}
        />
      </section>

      <!-- Card: Settlements -->
      <section class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          精算
        </h2>
        <SettlementList
          result={calculateSettlements(syncMembers, syncExpenses)}
          members={syncMembers}
          onpay={(from, to, amount) => { lightningPayTarget = { fromMemberId: from, toMemberId: to, amount } }}
        />
      </section>

      <!-- Lock settlement button (owner only, not yet locked) -->
      {#if sync?.isOwner && !sync?.isLocked}
        <div class="flex justify-center pt-2 pb-4">
          <button
            type="button"
            onclick={() => { showLockDialog = true }}
            class="rounded-xl bg-red-500 hover:bg-red-600 text-white px-6 py-3 text-sm font-semibold transition-colors shadow-sm"
          >
            精算を確定する
          </button>
        </div>
      {/if}
    </main>

    <!-- Footer -->
    <footer class="max-w-lg mx-auto w-full">
      <PriceFooter
        btcPrice={btcPriceStore.btcPrice}
        currency={currency}
      />
    </footer>
  {/if}
</div>

<!-- Dialogs -->
<CreateSettlementDialog
  isOpen={showCreateDialog}
  oncreate={handleCreate}
  onclose={() => { showCreateDialog = false }}
/>

{#if sync}
  <LockSettlementDialog
    isOpen={showLockDialog}
    expenseEventIds={sync.state?.expenses.map(e => e.eventId) ?? []}
    onlock={async (ids) => { await sync!.lockSettlement(ids); showLockDialog = false }}
    onclose={() => { showLockDialog = false }}
  />
{/if}

<LightningPaymentModal
  isOpen={!!lightningPayTarget}
  toMember={syncMembers.find(m => m.id === lightningPayTarget?.toMemberId) ?? null}
  amount={lightningPayTarget?.amount ?? 0}
  currency={currency}
  btcPrice={btcPriceStore.btcPrice}
  onclose={() => { lightningPayTarget = null }}
/>
