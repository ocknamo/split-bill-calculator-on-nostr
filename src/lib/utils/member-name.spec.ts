import { describe, it, expect } from 'vitest'
import { resolveUniqueName } from './member-name'
import type { Member } from '$lib/types/split-calculator'

function member(name: string, npub?: string): Member {
  return { id: crypto.randomUUID(), name, npub }
}

describe('resolveUniqueName', () => {
  it('重複がない場合はそのまま返す', () => {
    const members = [member('鈴木')]
    expect(resolveUniqueName('田中', members)).toBe('田中')
  })

  it('同名メンバーがいる場合(2)を付与', () => {
    const members = [member('田中')]
    expect(resolveUniqueName('田中', members)).toBe('田中(2)')
  })

  it('複数の同名メンバーがいる場合、次の番号を付与', () => {
    const members = [member('田中'), member('田中(2)')]
    expect(resolveUniqueName('田中', members)).toBe('田中(3)')
  })

  it('(N)付きの名前を入力しても正しくベース名を抽出する', () => {
    const members = [member('田中'), member('田中(2)')]
    expect(resolveUniqueName('田中(2)', members)).toBe('田中(3)')
  })

  it('Nostrメンバー（npub付き）は重複チェック対象外', () => {
    const members = [member('田中', 'npub1abc')]
    expect(resolveUniqueName('田中', members)).toBe('田中')
  })

  it('Nostrメンバーと通常メンバーが混在する場合', () => {
    const members = [member('田中', 'npub1abc'), member('田中')]
    expect(resolveUniqueName('田中', members)).toBe('田中(2)')
  })

  it('メンバーがいない場合はそのまま返す', () => {
    expect(resolveUniqueName('田中', [])).toBe('田中')
  })

  it('番号が飛んでいる場合は最大値+1を付与', () => {
    const members = [member('田中'), member('田中(5)')]
    expect(resolveUniqueName('田中', members)).toBe('田中(6)')
  })
})
