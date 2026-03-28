<script lang="ts">
  import { calculatorStore } from '$lib/stores/calculator.svelte'
  import { btcPriceStore } from '$lib/stores/btc-price.svelte'
  import ExpenseForm from './expense-form.svelte'
  import ExpenseList from './expense-list.svelte'
  import SettlementList from './settlement-list.svelte'
  import MemberList from './member-list.svelte'
  import CurrencySwitcher from './currency-switcher.svelte'
  import PriceFooter from './price-footer.svelte'

  $effect(() => {
    btcPriceStore.fetchBtcPrice()
  })
</script>

<div class="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col">
  <!-- Header -->
  <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
    <div class="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        ワリカンさん
      </h1>
      <CurrencySwitcher
        currency={calculatorStore.currency}
        oncurrencychange={(c) => { calculatorStore.currency = c }}
      />
    </div>
  </header>

  <!-- Main content -->
  <main class="flex-1 max-w-lg mx-auto w-full px-4 py-5 flex flex-col gap-4">
    <!-- Card 1: Members -->
    <section class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        メンバー
      </h2>
      <MemberList
        members={calculatorStore.members}
        isOwner={true}
        onadd={(name) => calculatorStore.addMember(name)}
        onremove={(id) => calculatorStore.removeMember(id)}
      />
    </section>

    <!-- Card 2: Add expense -->
    <section class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        支出を追加
      </h2>
      <ExpenseForm
        members={calculatorStore.members}
        currency={calculatorStore.currency}
        onadd={(expense) => calculatorStore.addExpense(expense)}
      />
    </section>

    <!-- Card 3: Expense list -->
    <section class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        支出一覧
      </h2>
      <ExpenseList
        expenses={calculatorStore.expenses}
        members={calculatorStore.members}
        currency={calculatorStore.currency}
        btcPrice={btcPriceStore.btcPrice}
        onremove={(id) => calculatorStore.removeExpense(id)}
      />
    </section>

    <!-- Card 4: Settlements -->
    <section class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        精算
      </h2>
      <SettlementList
        result={calculatorStore.settlements}
        members={calculatorStore.members}
      />
    </section>
  </main>

  <!-- Footer -->
  <footer class="max-w-lg mx-auto w-full">
    <PriceFooter
      btcPrice={btcPriceStore.btcPrice}
      currency={calculatorStore.currency}
    />
  </footer>
</div>
