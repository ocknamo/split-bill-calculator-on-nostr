export interface NostrProfile {
	name?: string
	displayName?: string
	picture?: string
	lud16?: string
	nip05?: string
}

export interface LnurlPayInfo {
	callback: string
	minSendable: number
	maxSendable: number
}
