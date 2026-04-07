<script lang="ts">
  import { Receipt, Trash2 } from 'lucide-svelte'
  import type { Currency, Expense, Member } from '$lib/types/split-calculator'
  import MemberAvatar from './MemberAvatar.svelte'

  interface Props {
    expenses: Expense[]
    members: Member[]
    currentCurrency: Currency
    formatCurrency: (amount: number) => string
    onRemoveExpense: (id: string) => void
  }

  let { expenses, members, currentCurrency, formatCurrency, onRemoveExpense }: Props = $props()

  function getMember(id: string): Member | undefined {
    return members.find((m) => m.id === id)
  }
</script>

{#if expenses.length > 0}
  <div class="mb-6 rounded-xl border-2 border-gray-200 bg-white">
    <div class="border-b border-gray-100 px-4 py-3">
      <h2 class="flex items-center gap-2 font-semibold text-gray-800">
        <Receipt class="h-4 w-4 text-blue-600" />
        支出一覧 ({expenses.length}件)
      </h2>
    </div>
    <ul class="divide-y divide-gray-50">
      {#each [...expenses].reverse() as expense (expense.id)}
        {@const payer = getMember(expense.paidById)}
        <li class="flex items-center gap-3 px-4 py-3">
          {#if payer}
            <MemberAvatar member={payer} size="sm" />
          {/if}
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium {expense.isCancelled ? 'line-through text-gray-400' : 'text-gray-800'}">{expense.description}</p>
            <p class="text-xs {expense.isCancelled ? 'line-through text-gray-300' : 'text-gray-400'}">{payer?.name ?? '不明'}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            {#if expense.currency !== currentCurrency}
              <span
                class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
              >
                {expense.currency.toUpperCase()}
              </span>
            {/if}
            <span class="text-sm font-semibold {expense.isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}">{formatCurrency(expense.amount)}</span>
            {#if !expense.isCancelled}
              <button
                onclick={() => onRemoveExpense(expense.id)}
                class="rounded p-1 text-gray-300 hover:text-red-500"
                aria-label="{expense.description}を削除"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  </div>
{/if}
