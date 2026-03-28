import { browser } from '$app/environment'

const BTC_PRICE_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=jpy,usd'

interface BtcPriceState {
  btcPrice: { jpy: number; usd: number } | null
  loading: boolean
  rateLimited: boolean
  fetchBtcPrice: () => Promise<void>
}

function createBtcPriceStore(): BtcPriceState {
  let btcPrice = $state<{ jpy: number; usd: number } | null>(null)
  let loading = $state(false)
  let rateLimited = $state(false)

  async function fetchBtcPrice(): Promise<void> {
    if (!browser) return
    if (rateLimited) return
    loading = true
    try {
      const res = await fetch(BTC_PRICE_API)
      if (res.status === 429) {
        rateLimited = true
        return
      }
      if (!res.ok) return
      const data = (await res.json()) as { bitcoin: { jpy: number; usd: number } }
      btcPrice = { jpy: data.bitcoin.jpy, usd: data.bitcoin.usd }
    } catch {
      // ignore
    } finally {
      loading = false
    }
  }

  return {
    get btcPrice() { return btcPrice },
    get loading() { return loading },
    get rateLimited() { return rateLimited },
    fetchBtcPrice,
  }
}

export const btcPriceStore = createBtcPriceStore()

export function formatBtcPrice(price: number | null, currency: 'jpy' | 'usd' = 'jpy'): string {
  if (price === null) return '-'
  return new Intl.NumberFormat(currency === 'jpy' ? 'ja-JP' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(price)
}
