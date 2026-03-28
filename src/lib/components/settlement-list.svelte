<script lang="ts">
  import type { Member } from '$lib/types/split-calculator'

  interface Settlement {
    id: string
    from: string
    to: string
    amount: number
  }

  interface SettlementsResult {
    totalAmount: number
    perPerson: number
    settlements: Settlement[]
    memberPaidTotals: Record<string, number>
  }

  let { result, members, onpay }: {
    result: SettlementsResult
    members: Member[]
    onpay?: (fromMemberId: string, toMemberId: string, amount: number) => void
  } = $props()

  function getMember(id: string): Member | undefined {
    return members.find((m) => m.id === id)
  }

  function getMemberName(id: string): string {
    return getMember(id)?.name ?? '不明'
  }

  function formatJpy(amount: number): string {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
  }
</script>

<div class="space-y-4">
  <div class="grid grid-cols-2 gap-3">
    <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
      <p class="text-xs text-gray-500 dark:text-gray-400">合計金額</p>
      <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
        {formatJpy(result.totalAmount)}
      </p>
    </div>
    <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
      <p class="text-xs text-gray-500 dark:text-gray-400">一人あたり</p>
      <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
        {formatJpy(result.perPerson)}
      </p>
    </div>
  </div>

  <div class="space-y-2">
    {#if result.settlements.length === 0}
      <p class="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">精算不要</p>
    {:else}
      {#each result.settlements as settlement (settlement.id)}
        {@const toMember = getMember(settlement.to)}
        <div class="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
          <p class="text-sm text-gray-800 dark:text-gray-200 min-w-0 flex-1">
            <span class="font-medium">{getMemberName(settlement.from)}さん</span>
            が
            <span class="font-medium">{getMemberName(settlement.to)}さん</span>
            に
            <span class="font-semibold tabular-nums">{formatJpy(settlement.amount)}</span>
            払う
          </p>
          {#if onpay && toMember?.nostrProfile?.lud16}
            <button
              type="button"
              onclick={() => onpay!(settlement.from, settlement.to, settlement.amount)}
              class="flex-shrink-0 inline-flex items-center gap-1.5 rounded-md bg-amber-400 hover:bg-amber-300 active:bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Lightning
            </button>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
