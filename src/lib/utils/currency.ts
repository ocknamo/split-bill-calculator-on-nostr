import { CURRENCY_SYMBOLS, SATS_PER_BTC } from "$lib/constants";
import type { BtcPrice, Currency } from "$lib/types/split-calculator";

export function formatCurrency(amount: number, currency: Currency): string {
  if (currency === "usd") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency];
}

export function fiatToSats(fiat: number, btcPrice: BtcPrice | null, currency: Currency): number {
  if (!btcPrice) return 0;
  const price = currency === "jpy" ? btcPrice.jpy : btcPrice.usd;
  return Math.round((fiat * SATS_PER_BTC) / price);
}

export function formatBtcPrice(btcPrice: BtcPrice | null, currency: Currency): string {
  if (!btcPrice) return "-";
  const price = currency === "jpy" ? btcPrice.jpy : btcPrice.usd;
  return `${CURRENCY_SYMBOLS[currency]}${price.toLocaleString()}`;
}
