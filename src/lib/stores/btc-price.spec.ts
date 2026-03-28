import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('$app/environment', () => ({ browser: false }))

describe('btcPriceStore (browser=false)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('初期状態: btcPrice=null, loading=false (browser=false)', async () => {
    const mod = await import('./btc-price.svelte')
    expect(mod.btcPriceStore.btcPrice).toBeNull()
    expect(mod.btcPriceStore.loading).toBe(false)
    expect(mod.btcPriceStore.rateLimited).toBe(false)
  })

  it('fetchBtcPrice は browser=false では何もしない', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const mod = await import('./btc-price.svelte')
    await mod.btcPriceStore.fetchBtcPrice()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('btcPriceStore helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('formatBtcPrice: null のとき "-" を返す', async () => {
    const { formatBtcPrice } = await import('./btc-price.svelte')
    expect(formatBtcPrice(null)).toBe('-')
  })

  it('formatBtcPrice: 数値を通貨形式でフォーマットする', async () => {
    const { formatBtcPrice } = await import('./btc-price.svelte')
    const result = formatBtcPrice(50000)
    expect(result).toMatch(/50/)
  })
})
