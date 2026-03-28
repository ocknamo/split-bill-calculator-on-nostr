import { COINGECKO_API_URL } from '$lib/constants'
import type { BtcPrice } from '$lib/types/split-calculator'

const RATE_LIMIT_COOLDOWN_MS = 60_000 // 1 minute
const MIN_FETCH_INTERVAL_MS = 10_000 // 10 seconds

export class BtcPriceStore {
	price = $state<BtcPrice | null>(null)
	loading = $state(false)
	error = $state<string | null>(null)
	rateLimited = $state(false)

	#lastFetchTime = 0
	#rateLimitEndTime = 0

	async fetch(force = false): Promise<void> {
		const now = Date.now()

		if (this.#rateLimitEndTime > now) {
			const remaining = Math.ceil((this.#rateLimitEndTime - now) / 1000)
			this.error = `レート制限中です。${remaining}秒後に再試行してください`
			return
		}

		if (!force && now - this.#lastFetchTime < MIN_FETCH_INTERVAL_MS) {
			return
		}

		this.loading = true
		this.error = null
		this.rateLimited = false

		try {
			const res = await fetch(COINGECKO_API_URL)

			if (res.status === 429) {
				this.#rateLimitEndTime = now + RATE_LIMIT_COOLDOWN_MS
				this.rateLimited = true
				this.error = 'APIのレート制限に達しました。1分後に再試行してください'
				return
			}

			if (!res.ok) {
				throw new Error(`HTTP error: ${res.status}`)
			}

			const data = await res.json()

			if (data?.bitcoin?.jpy && data?.bitcoin?.usd) {
				this.price = { jpy: data.bitcoin.jpy, usd: data.bitcoin.usd }
				this.#lastFetchTime = now
				this.error = null
			} else {
				throw new Error('Invalid response format')
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : '不明なエラー'
			this.error = `価格の取得に失敗しました: ${message}`
		} finally {
			this.loading = false
		}
	}
}
