import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	clearOwnerKey,
	cleanupOldOwnerKeys,
	hasOwnerKey,
	loadOwnerKey,
	saveOwnerKey
} from './storage'

describe('saveOwnerKey / loadOwnerKey', () => {
	const settlementId = 'test-settlement-id'
	const sk = new Uint8Array(32).fill(42)
	const pubkey = 'test-pubkey-hex'

	beforeEach(() => {
		localStorage.clear()
	})

	afterEach(() => {
		localStorage.clear()
	})

	it('should save and load owner key', () => {
		saveOwnerKey(settlementId, sk, pubkey)
		const loaded = loadOwnerKey(settlementId)

		expect(loaded).not.toBeNull()
		expect(loaded!.pubkey).toBe(pubkey)
		expect(loaded!.sk).toEqual(sk)
	})

	it('should return null when no key saved', () => {
		expect(loadOwnerKey('nonexistent')).toBeNull()
	})

	it('should return null after clear', () => {
		saveOwnerKey(settlementId, sk, pubkey)
		clearOwnerKey(settlementId)
		expect(loadOwnerKey(settlementId)).toBeNull()
	})

	it('should not affect other settlement keys on clear', () => {
		const id2 = 'other-settlement'
		const sk2 = new Uint8Array(32).fill(99)
		saveOwnerKey(settlementId, sk, pubkey)
		saveOwnerKey(id2, sk2, 'pubkey2')

		clearOwnerKey(settlementId)

		expect(loadOwnerKey(settlementId)).toBeNull()
		expect(loadOwnerKey(id2)).not.toBeNull()
	})
})

describe('hasOwnerKey', () => {
	beforeEach(() => localStorage.clear())
	afterEach(() => localStorage.clear())

	it('should return true when key exists', () => {
		saveOwnerKey('sid', new Uint8Array(32), 'pk')
		expect(hasOwnerKey('sid')).toBe(true)
	})

	it('should return false when key does not exist', () => {
		expect(hasOwnerKey('sid')).toBe(false)
	})
})

describe('cleanupOldOwnerKeys', () => {
	beforeEach(() => localStorage.clear())
	afterEach(() => localStorage.clear())

	it('should remove keys older than 30 days', () => {
		const sk = new Uint8Array(32)
		saveOwnerKey('old', sk, 'pk')

		// Manually set createdAt to 31 days ago
		const stored = JSON.parse(localStorage.getItem('warikan-owner-keys')!)
		stored['old'].createdAt = Date.now() - 31 * 24 * 60 * 60 * 1000
		localStorage.setItem('warikan-owner-keys', JSON.stringify(stored))

		cleanupOldOwnerKeys()

		expect(loadOwnerKey('old')).toBeNull()
	})

	it('should keep keys newer than 30 days', () => {
		const sk = new Uint8Array(32)
		saveOwnerKey('new', sk, 'pk')

		cleanupOldOwnerKeys()

		expect(loadOwnerKey('new')).not.toBeNull()
	})
})
