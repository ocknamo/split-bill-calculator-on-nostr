<script lang="ts">
  import { PlusCircle } from 'lucide-svelte'
  import type { Currency, Expense, Member } from '$lib/types/split-calculator'

  interface Props {
    members: Member[]
    currency: Currency
    currencySymbol: string
    onAddExpense: (expense: Expense) => void | Promise<void>
  }

  let { members, currency, currencySymbol, onAddExpense }: Props = $props()

  let description = $state('')
  let amount = $state('')
  let paidById = $state('')

  // Reset paidById when members change and selection is invalid
  $effect(() => {
    if (paidById && !members.find((m) => m.id === paidById)) {
      paidById = members[0]?.id ?? ''
    }
    if (!paidById && members.length > 0) {
      paidById = members[0].id
    }
  })

  const isValid = $derived(
    description.trim().length > 0 && Number(amount) > 0 && paidById !== ''
  )

  function submit() {
    if (!isValid) return
    onAddExpense({
      id: crypto.randomUUID(),
      description: description.trim(),
      amount: Number(amount),
      paidById,
      currency,
    })
    description = ''
    amount = ''
  }
</script>

<div class="mb-6 rounded-xl border-2 border-gray-200 bg-white">
  <div class="border-b border-gray-100 px-4 py-3">
    <h2 class="font-semibold text-gray-800">支出を追加</h2>
  </div>
  <div class="space-y-3 p-4">
    <div>
      <label for="expense-desc" class="mb-1 block text-xs font-medium text-gray-600">内容</label>
      <input
        id="expense-desc"
        type="text"
        placeholder="例: 夕食代"
        bind:value={description}
        onkeydown={(e) => e.key === 'Enter' && submit()}
        class="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="expense-amount" class="mb-1 block text-xs font-medium text-gray-600">
          金額 ({currencySymbol})
        </label>
        <input
          id="expense-amount"
          type="number"
          min="0"
          placeholder="0"
          bind:value={amount}
          onkeydown={(e) => e.key === 'Enter' && submit()}
          class="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label for="expense-payer" class="mb-1 block text-xs font-medium text-gray-600"
          >支払者</label
        >
        <select
          id="expense-payer"
          bind:value={paidById}
          class="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {#each members as member (member.id)}
            <option value={member.id}>{member.name}</option>
          {/each}
        </select>
      </div>
    </div>
    <button
      onclick={submit}
      disabled={!isValid}
      class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
    >
      <PlusCircle class="h-4 w-4" />
      追加
    </button>
  </div>
</div>
