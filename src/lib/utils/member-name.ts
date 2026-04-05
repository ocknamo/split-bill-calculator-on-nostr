import type { Member } from '$lib/types/split-calculator'

/**
 * 同名メンバーがいる場合、連番を付与したユニークな名前を返す。
 * 例: 田中 → 田中(2) → 田中(3)
 * Nostr追加メンバー（npub付き）は重複チェック対象外。
 */
export function resolveUniqueName(inputName: string, members: Member[]): string {
  const root = extractBaseName(inputName)

  const nonNostrMembers = members.filter((m) => !m.npub)

  const existing = nonNostrMembers.filter((m) => extractBaseName(m.name) === root)

  if (existing.length === 0) return root

  let maxSerial = 1
  for (const m of existing) {
    const match = m.name.match(/\((\d+)\)$/)
    if (match) {
      maxSerial = Math.max(maxSerial, parseInt(match[1]))
    }
  }

  return `${root}(${maxSerial + 1})`
}

function extractBaseName(name: string): string {
  const match = name.match(/^(.+?)\(\d+\)$/)
  return match ? match[1] : name
}
