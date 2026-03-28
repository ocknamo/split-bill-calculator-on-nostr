import type { LnurlPayInfo } from '$lib/types/nostr'

export async function fetchLnurlPayInfo(lud16: string): Promise<LnurlPayInfo | null> {
	try {
		const [name, domain] = lud16.split('@')
		if (!name || !domain) return null

		const url = `https://${domain}/.well-known/lnurlp/${name}`
		const response = await fetch(url)
		const data = await response.json()

		if (data.callback) {
			return {
				callback: data.callback,
				minSendable: data.minSendable || 1000,
				maxSendable: data.maxSendable || 100000000000
			}
		}
		return null
	} catch {
		return null
	}
}

export async function fetchLightningInvoice(
	callback: string,
	amountMsat: number
): Promise<string | null> {
	try {
		const url = `${callback}?amount=${amountMsat}`
		const response = await fetch(url)
		const data = await response.json()
		return data.pr ?? null
	} catch {
		return null
	}
}
