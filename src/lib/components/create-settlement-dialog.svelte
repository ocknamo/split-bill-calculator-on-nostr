<script lang="ts">
  import type { Currency } from '$lib/types/split-calculator'

  let { isOpen, oncreate, onclose }: {
    isOpen: boolean
    oncreate: (name: string, currency: Currency) => Promise<void>
    onclose: () => void
  } = $props()

  let settlementName = $state('')
  let currency = $state<Currency>('jpy')
  let isLoading = $state(false)

  async function handleCreate() {
    const trimmed = settlementName.trim()
    if (!trimmed || isLoading) return
    isLoading = true
    try {
      await oncreate(trimmed, currency)
    } finally {
      isLoading = false
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleCreate()
  }

  function resetForm() {
    settlementName = ''
    currency = 'jpy'
  }

  $effect(() => {
    if (!isOpen) resetForm()
  })
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-40 bg-black/50"
    role="presentation"
    onclick={onclose}
  ></div>

  <!-- Dialog -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="create-dialog-title"
  >
    <div
      class="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6 flex flex-col gap-4"
      role="presentation"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 id="create-dialog-title" class="text-lg font-bold text-gray-900 dark:text-gray-100">
        精算セッションを作成
      </h2>

      <!-- Settlement name input -->
      <div class="flex flex-col gap-1.5">
        <label for="settlement-name" class="text-sm font-medium text-gray-700 dark:text-gray-300">
          セッション名
        </label>
        <input
          id="settlement-name"
          type="text"
          bind:value={settlementName}
          onkeydown={handleKeydown}
          placeholder="旅行精算など"
          disabled={isLoading}
          class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <!-- Currency radio buttons -->
      <div class="flex flex-col gap-1.5">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">通貨</span>
        <div class="flex gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="currency"
              value="jpy"
              bind:group={currency}
              disabled={isLoading}
              class="accent-blue-500"
            />
            <span class="text-sm text-gray-800 dark:text-gray-100">JPY (円)</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="currency"
              value="usd"
              bind:group={currency}
              disabled={isLoading}
              class="accent-blue-500"
            />
            <span class="text-sm text-gray-800 dark:text-gray-100">USD ($)</span>
          </label>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onclick={handleCreate}
          disabled={!settlementName.trim() || isLoading}
          class="w-full rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if isLoading}
            <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            作成中...
          {:else}
            作成する
          {/if}
        </button>

        <button
          type="button"
          onclick={onclose}
          disabled={isLoading}
          class="w-full rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
        >
          キャンセル
        </button>
      </div>
    </div>
  </div>
{/if}
