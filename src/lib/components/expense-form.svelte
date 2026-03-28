<script lang="ts">
  import type { Member, Currency } from '$lib/types/split-calculator'

  let { members, currency, onadd }: {
    members: Member[]
    currency: Currency
    onadd: (expense: { description: string; amount: number; paidById: string; currency: Currency }) => void
  } = $props()

  let description = $state('')
  let amountStr = $state('')
  let paidById = $state('')
  let error = $state('')

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    error = ''

    const trimmedDescription = description.trim()
    const amount = parseFloat(amountStr)

    if (!trimmedDescription) {
      error = '説明を入力してください'
      return
    }
    if (!amountStr || isNaN(amount) || amount <= 0) {
      error = '金額は0より大きい値を入力してください'
      return
    }
    if (!paidById) {
      error = '支払い者を選択してください'
      return
    }

    onadd({ description: trimmedDescription, amount, paidById, currency })

    description = ''
    amountStr = ''
    paidById = ''
  }
</script>

<form onsubmit={handleSubmit} class="space-y-3">
  <div>
    <label for="expense-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      説明
    </label>
    <input
      id="expense-description"
      type="text"
      bind:value={description}
      placeholder="例: 夕食"
      class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
    />
  </div>

  <div>
    <label for="expense-amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      金額 ({currency === 'jpy' ? '¥' : '$'})
    </label>
    <input
      id="expense-amount"
      type="number"
      bind:value={amountStr}
      placeholder={currency === 'jpy' ? '例: 3000' : '例: 20.00'}
      min="0"
      step={currency === 'jpy' ? '1' : '0.01'}
      class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
    />
  </div>

  <div>
    <label for="expense-payer" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      支払い者
    </label>
    <select
      id="expense-payer"
      bind:value={paidById}
      class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
    >
      <option value="" disabled>選択してください</option>
      {#each members as member (member.id)}
        <option value={member.id}>{member.name}</option>
      {/each}
    </select>
  </div>

  {#if error}
    <p class="text-xs text-red-500 dark:text-red-400">{error}</p>
  {/if}

  <button
    type="submit"
    class="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
  >
    追加
  </button>
</form>
