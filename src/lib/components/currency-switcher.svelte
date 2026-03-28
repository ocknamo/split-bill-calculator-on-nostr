<script lang="ts">
  import type { Currency } from '$lib/types/split-calculator'

  let {
    currency,
    oncurrencychange
  }: {
    currency: Currency
    oncurrencychange: (c: Currency) => void
  } = $props()
</script>

<div class="inline-flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
  <button
    type="button"
    class="px-3 py-1.5 text-sm font-medium transition-colors {currency === 'jpy'
      ? 'bg-indigo-600 text-white'
      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
    onclick={() => currency !== 'jpy' && oncurrencychange('jpy')}
  >
    JPY
  </button>
  <button
    type="button"
    class="px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300 dark:border-gray-600 {currency === 'usd'
      ? 'bg-indigo-600 text-white'
      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}"
    onclick={() => currency !== 'usd' && oncurrencychange('usd')}
  >
    USD
  </button>
</div>
