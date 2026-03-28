<script lang="ts">
  import type { Currency } from '$lib/types/split-calculator'

  let {
    btcPrice,
    currency
  }: {
    btcPrice: { jpy: number; usd: number } | null
    currency: Currency
  } = $props()

  let formattedPrice = $derived(() => {
    if (!btcPrice) return '-'
    const value = currency === 'jpy' ? btcPrice.jpy : btcPrice.usd
    const locale = currency === 'jpy' ? 'ja-JP' : 'en-US'
    const currencyCode = currency === 'jpy' ? 'JPY' : 'USD'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: currency === 'jpy' ? 0 : 2
    }).format(value)
  })
</script>

<div class="flex items-center justify-center py-2 px-4">
  <p class="text-xs text-gray-400 dark:text-gray-500">
    BTC/{ currency.toUpperCase() }: <span class="font-medium">{formattedPrice()}</span>
  </p>
</div>
