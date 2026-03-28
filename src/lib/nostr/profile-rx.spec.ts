import { describe, expect, it } from 'vitest'
import { isValidNpub, npubToHex } from './profile-rx'

// A known valid npub and its hex equivalent for testing (32 zero bytes)
const KNOWN_NPUB = 'npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzqujme'
const KNOWN_HEX = '0000000000000000000000000000000000000000000000000000000000000000'

describe('npubToHex', () => {
  it('有効な npub を 64 文字 hex に変換する', () => {
    const hex = npubToHex(KNOWN_NPUB)
    expect(hex).toBe(KNOWN_HEX)
  })

  it('prefix が npub 以外の場合は null を返す', () => {
    // nsec prefix should fail
    expect(npubToHex('nsec1invalid')).toBeNull()
  })

  it('不正な bech32 文字列で null を返す', () => {
    expect(npubToHex('not-valid')).toBeNull()
    expect(npubToHex('')).toBeNull()
    expect(npubToHex('npub1')).toBeNull()
  })
})

describe('isValidNpub', () => {
  it('有効な npub で true を返す', () => {
    expect(isValidNpub(KNOWN_NPUB)).toBe(true)
  })

  it('無効な入力で false を返す', () => {
    expect(isValidNpub('not-a-npub')).toBe(false)
    expect(isValidNpub('')).toBe(false)
    expect(isValidNpub('npub1invalid!')).toBe(false)
  })
})
