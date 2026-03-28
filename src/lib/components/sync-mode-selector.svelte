<script lang="ts">
  let { onstandalone, onsync }: {
    onstandalone: () => void
    onsync: () => void
  } = $props()
</script>

<div class="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col items-center justify-center p-6">
  <div class="w-full max-w-md flex flex-col items-center gap-8">
    <!-- App title -->
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        ワリカンさん
      </h1>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        モードを選択してください
      </p>
    </div>

    <!-- Mode cards -->
    <div class="w-full flex flex-col gap-4">
      <!-- Standalone mode -->
      <button
        type="button"
        onclick={onstandalone}
        class="group w-full rounded-2xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 p-6 text-left shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
            <!-- Calculator icon -->
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="10" y2="10" />
              <line x1="14" y1="10" x2="16" y2="10" />
              <line x1="8" y1="14" x2="10" y2="14" />
              <line x1="14" y1="14" x2="16" y2="14" />
              <line x1="8" y1="18" x2="10" y2="18" />
              <line x1="14" y1="18" x2="16" y2="18" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              スタンドアローンモード
            </p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              ブラウザのみで計算
            </p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
      </button>

      <!-- Sync mode -->
      <button
        type="button"
        onclick={onsync}
        class="group w-full rounded-2xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 p-6 text-left shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
            <!-- Wifi icon -->
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <circle cx="12" cy="20" r="1" fill="currentColor" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              同期モード
            </p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Nostrで複数人と共有
            </p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
      </button>
    </div>
  </div>
</div>
