// Nostr Relays
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://yabu.me',
  'wss://r.kojira.io',
] as const

// API URLs
export const COINGECKO_API_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=jpy,usd'

// Currency
export const CURRENCY_SYMBOLS = {
  jpy: '¥',
  usd: '$',
} as const

export const CURRENCY_LABELS = {
  jpy: 'JPY (円)',
  usd: 'USD ($)',
} as const

// Satoshi conversion
export const SATS_PER_BTC = 100_000_000
