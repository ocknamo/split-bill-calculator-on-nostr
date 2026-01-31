'use client'

import { useCallback, useMemo } from 'react'
import { CURRENCY_SYMBOLS, SATS_PER_BTC } from '@/lib/constants'
import type { BtcPrice, Currency } from '@/types/split-calculator'

export function useCurrency(
  btcPrice: BtcPrice | null,
  currency: Currency = 'jpy',
  onCurrencyChange?: (currency: Currency) => void
) {
  const setCurrency = useCallback(
    (newCurrency: Currency) => {
      onCurrencyChange?.(newCurrency)
    },
    [onCurrencyChange]
  )

  const formatCurrency = useCallback(
    (amount: number) => {
      if (currency === 'usd') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
        }).format(amount)
      }
      return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0,
      }).format(amount)
    },
    [currency]
  )

  const currencySymbol = useMemo(() => CURRENCY_SYMBOLS[currency], [currency])

  const fiatToSats = useCallback(
    (fiat: number) => {
      if (!btcPrice) return 0
      const price = currency === 'jpy' ? btcPrice.jpy : btcPrice.usd
      return Math.round((fiat * SATS_PER_BTC) / price)
    },
    [btcPrice, currency]
  )

  const formatBtcPrice = useCallback(() => {
    if (!btcPrice) return '-'
    const price = currency === 'jpy' ? btcPrice.jpy : btcPrice.usd
    return `${CURRENCY_SYMBOLS[currency]}${price.toLocaleString()}`
  }, [btcPrice, currency])

  return {
    currency,
    setCurrency,
    formatCurrency,
    currencySymbol,
    fiatToSats,
    formatBtcPrice,
  }
}
