<script lang="ts">
  import type { Currency } from '$lib/types/split-calculator'

  interface Props {
    currency: Currency
    onCurrencyChange: (c: Currency) => void
  }

  let { currency, onCurrencyChange }: Props = $props()
</script>

<div class="inline-flex rounded-lg border-2 border-gray-200 bg-gray-50 p-1">
  <button
    onclick={() => onCurrencyChange('jpy')}
    class="rounded px-4 py-1.5 text-sm font-medium transition-colors {currency === 'jpy'
      ? 'bg-white text-gray-900 shadow-sm'
      : 'text-gray-500 hover:text-gray-700'}"
  >
    JPY ¥
  </button>
  <button
    onclick={() => onCurrencyChange('usd')}
    class="rounded px-4 py-1.5 text-sm font-medium transition-colors {currency === 'usd'
      ? 'bg-white text-gray-900 shadow-sm'
      : 'text-gray-500 hover:text-gray-700'}"
  >
    USD $
  </button>
</div>
