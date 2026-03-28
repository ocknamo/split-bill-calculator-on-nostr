<script lang="ts">
  import type { Expense, Member, Currency, BtcPrice } from '$lib/types/split-calculator'

  let { expenses, members, currency, btcPrice, onremove }: {
    expenses: Expense[]
    members: Member[]
    currency: Currency
    btcPrice: BtcPrice | null
    onremove: (id: string) => void
  } = $props()

  function getMemberName(id: string): string {
    return members.find((m) => m.id === id)?.name ?? '不明'
  }

  function formatAmount(amount: number, cur: Currency): string {
    if (cur === 'jpy') {
      return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }
</script>

<div class="space-y-2">
  {#if expenses.length === 0}
    <p class="text-center text-gray-500 dark:text-gray-400 py-6 text-sm">支出がありません</p>
  {:else}
    {#each expenses as expense (expense.id)}
      <div class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium text-gray-900 dark:text-gray-100 text-sm">
            {expense.description}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {getMemberName(expense.paidById)} が支払い
          </p>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
          <span class="font-semibold text-gray-900 dark:text-gray-100 text-sm tabular-nums">
            {formatAmount(expense.amount, expense.currency)}
          </span>
          <button
            type="button"
            onclick={() => onremove(expense.id)}
            class="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            aria-label="削除"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    {/each}
  {/if}
</div>
