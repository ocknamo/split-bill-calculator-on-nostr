<script lang="ts">
  import { Lock } from 'lucide-svelte'

  interface ExpenseItem {
    id: string
    description: string
    amount: number
    memberName: string
    isValid: boolean
    invalidReason?: string
  }

  interface Props {
    expenses: ExpenseItem[]
    formatCurrency: (amount: number) => string
    onLock: (acceptedEventIds: string[]) => Promise<void>
  }

  let { expenses, formatCurrency, onLock }: Props = $props()

  let isOpen = $state(false)
  let loading = $state(false)
  let selected = $state<Set<string>>(new Set<string>())

  $effect(() => {
    selected = new Set(expenses.filter((e) => e.isValid).map((e) => e.id))
  })

  const total = $derived(
    expenses.filter((e) => selected.has(e.id)).reduce((sum, e) => sum + e.amount, 0)
  )

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selected = next
  }

  function selectAll() {
    selected = new Set(expenses.map((e) => e.id))
  }

  function deselectAll() {
    selected = new Set()
  }

  async function doLock() {
    loading = true
    try {
      await onLock([...selected])
      isOpen = false
    } finally {
      loading = false
    }
  }
</script>

<button
  onclick={() => (isOpen = true)}
  class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-orange-300 bg-orange-50 py-3 text-sm font-medium text-orange-700 hover:bg-orange-100"
>
  <Lock class="h-4 w-4" />
  精算を確定する
</button>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onclick={() => (isOpen = false)}
    onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
  >
    <div
      class="mx-4 flex w-full max-w-md flex-col rounded-xl bg-white shadow-xl"
      style="max-height: 80vh"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="border-b border-gray-100 p-4">
        <h2 class="text-lg font-bold text-gray-900">精算を確定</h2>
        <p class="text-sm text-gray-500">承認する支出を選択してください</p>
      </div>

      <div class="flex gap-2 border-b border-gray-100 px-4 py-2">
        <button onclick={selectAll} class="text-xs text-blue-600 hover:underline">全選択</button>
        <span class="text-gray-300">|</span>
        <button onclick={deselectAll} class="text-xs text-gray-500 hover:underline">
          全解除
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        {#each expenses as expense (expense.id)}
          <label
            class="flex cursor-pointer items-start gap-3 border-b border-gray-50 px-4 py-3 hover:bg-gray-50 {!expense.isValid
              ? 'opacity-60'
              : ''}"
          >
            <input
              type="checkbox"
              checked={selected.has(expense.id)}
              onchange={() => toggle(expense.id)}
              class="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-800">{expense.description}</p>
              <p class="text-xs text-gray-400">{expense.memberName}</p>
              {#if !expense.isValid && expense.invalidReason}
                <p class="text-xs text-red-500">{expense.invalidReason}</p>
              {/if}
            </div>
            <span class="shrink-0 text-sm font-medium text-gray-700">
              {formatCurrency(expense.amount)}
            </span>
          </label>
        {/each}
      </div>

      <div class="border-t border-gray-100 p-4">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm text-gray-600">選択合計</span>
          <span class="font-bold text-gray-900">{formatCurrency(total)}</span>
        </div>
        <div class="flex gap-3">
          <button
            onclick={() => (isOpen = false)}
            class="flex-1 rounded-lg border-2 border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onclick={doLock}
            disabled={selected.size === 0 || loading}
            class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-40"
          >
            <Lock class="h-4 w-4" />
            確定する
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
