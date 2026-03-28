import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('$app/environment', () => ({ browser: false }))

vi.mock('$lib/nostr/settlement/relay-rx', () => ({
  createRelayClient: vi.fn(() => ({
    subscribe: vi.fn(() => ({ close: vi.fn() })),
    publish: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  })),
  fetchSettlementEvents: vi.fn(() => Promise.resolve([])),
}))

vi.mock('@rx-nostr/crypto', () => ({
  getPublicKey: () => 'mock-pubkey',
  getEventHash: () => 'mock-event-id',
  getSignature: () => 'mock-sig',
}))

describe('parseInviteLink', () => {
  beforeEach(() => vi.resetModules())

  it('有効な招待リンクをパースできる', async () => {
    const { parseInviteLink } = await import('./settlement-sync.svelte')
    const result = parseInviteLink('https://example.com/?s=settlement-123&t=token-abc')
    expect(result).toEqual({ settlementId: 'settlement-123', inviteToken: 'token-abc' })
  })

  it('不正な URL で null を返す', async () => {
    const { parseInviteLink } = await import('./settlement-sync.svelte')
    expect(parseInviteLink('not-a-url')).toBeNull()
  })

  it('s が欠けている場合 null を返す', async () => {
    const { parseInviteLink } = await import('./settlement-sync.svelte')
    expect(parseInviteLink('https://example.com/?t=token-abc')).toBeNull()
  })

  it('t が欠けている場合 null を返す', async () => {
    const { parseInviteLink } = await import('./settlement-sync.svelte')
    expect(parseInviteLink('https://example.com/?s=settlement-123')).toBeNull()
  })

  it('追加パラメータがあっても正しくパースできる', async () => {
    const { parseInviteLink } = await import('./settlement-sync.svelte')
    const result = parseInviteLink('https://example.com/?s=settlement-123&t=token-abc&extra=value')
    expect(result).toEqual({ settlementId: 'settlement-123', inviteToken: 'token-abc' })
  })
})

describe('generateInviteLink', () => {
  beforeEach(() => vi.resetModules())

  it('招待リンクを生成できる', async () => {
    const { generateInviteLink } = await import('./settlement-sync.svelte')
    const result = generateInviteLink('settlement-123', 'token-abc', 'https://example.com/')
    expect(result).toBe('https://example.com/?s=settlement-123&t=token-abc')
  })

  it('特殊文字を URL エンコードする', async () => {
    const { generateInviteLink } = await import('./settlement-sync.svelte')
    const result = generateInviteLink('settlement/123', 'token+abc', 'https://example.com/')
    expect(result).toContain('settlement%2F123')
    expect(result).toContain('token%2Babc')
  })
})

describe('SettlementSync (browser=false)', () => {
  beforeEach(() => vi.resetModules())

  it('初期状態: isLoading=false, state=null, error=null (browser=false は init しない)', async () => {
    const { SettlementSync } = await import('./settlement-sync.svelte')
    const sync = new SettlementSync({ settlementId: 'test-id', inviteToken: 'test-token' })
    expect(sync.isLoading).toBe(false)
    expect(sync.state).toBeNull()
    expect(sync.error).toBeNull()
  })

  it('isOwner: ownerKey なしで false', async () => {
    const { SettlementSync } = await import('./settlement-sync.svelte')
    const sync = new SettlementSync({ settlementId: 'test-id', inviteToken: 'test-token' })
    expect(sync.isOwner).toBe(false)
  })

  it('addExpense: amount <= 0 でエラー [H4]', async () => {
    const { SettlementSync } = await import('./settlement-sync.svelte')
    const sync = new SettlementSync({ settlementId: 'test-id', inviteToken: 'test-token' })
    await expect(sync.addExpense('pubkey', 0, 'jpy', 'note')).rejects.toThrow()
    await expect(sync.addExpense('pubkey', -100, 'jpy', 'note')).rejects.toThrow()
  })

  it('addMember: ownerKey なしでエラー', async () => {
    const { SettlementSync } = await import('./settlement-sync.svelte')
    const sync = new SettlementSync({ settlementId: 'test-id', inviteToken: 'test-token' })
    await expect(sync.addMember('pubkey', 'Alice')).rejects.toThrow()
  })

  it('connectionStatus 初期値: disconnected (browser=false)', async () => {
    const { SettlementSync } = await import('./settlement-sync.svelte')
    const sync = new SettlementSync({ settlementId: 'test-id', inviteToken: 'test-token' })
    expect(sync.connectionStatus).toBe('disconnected')
  })
})
