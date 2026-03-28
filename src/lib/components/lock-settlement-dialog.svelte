<script lang="ts">
  let { isOpen, expenseEventIds, onlock, onclose }: {
    isOpen: boolean
    expenseEventIds: string[]
    onlock: (acceptedEventIds: string[]) => Promise<void>
    onclose: () => void
  } = $props()

  let isLoading = $state(false)

  async function handleLock() {
    if (isLoading) return
    isLoading = true
    try {
      await onlock(expenseEventIds)
    } finally {
      isLoading = false
    }
  }
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
    aria-labelledby="lock-dialog-title"
  >
    <div
      class="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6 flex flex-col gap-4"
      role="presentation"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 id="lock-dialog-title" class="text-lg font-bold text-gray-900 dark:text-gray-100">
        精算を確定する
      </h2>

      <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        以下の支出を採用して精算を確定します。この操作は取り消せません。
      </p>

      <div class="rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-4 py-3">
        <p class="text-sm font-medium text-amber-800 dark:text-amber-300">
          採用支出: {expenseEventIds.length}件
        </p>
      </div>

      <div class="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onclick={handleLock}
          disabled={isLoading}
          class="w-full rounded-lg bg-red-500 hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-800 text-white px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if isLoading}
            <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            確定中...
          {:else}
            確定する
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
