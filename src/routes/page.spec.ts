import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Page from './+page.svelte'

// vi.hoisted でモッククラスをホイスト（vi.mock より先に評価される）
const {
  MockSettlementSync,
  mockParseInviteLink,
  mockCreateSettlement,
  mockGenerateInviteLink,
  mockGenerateInviteToken,
  mockGenerateSettlementId,
} = vi.hoisted(() => {
  const mockParseInviteLink = vi.fn().mockReturnValue(null)
  const mockCreateSettlement = vi.fn().mockResolvedValue({})
  const mockGenerateInviteLink = vi.fn().mockReturnValue('/join?s=test-id&t=test-token')
  const mockGenerateInviteToken = vi.fn().mockReturnValue('test-invite-token')
  const mockGenerateSettlementId = vi.fn().mockReturnValue('test-settlement-id')

  class MockSettlementSync {
    isLoading = false
    connectionStatus = 'disconnected'
    error = null
    isOwner = false
    members: never[] = []
    expenses: never[] = []
    settlements: never[] = []
    isClosed = false
    currency = 'jpy'
    settlementName = ''

    init = vi.fn().mockResolvedValue(undefined)
    addMember = vi.fn()
    addExpense = vi.fn()
    lockSettlement = vi.fn()
    refresh = vi.fn()
    destroy = vi.fn()
  }

  return {
    MockSettlementSync,
    mockParseInviteLink,
    mockCreateSettlement,
    mockGenerateInviteLink,
    mockGenerateInviteToken,
    mockGenerateSettlementId,
  }
})

vi.mock('$lib/nostr/settlement/settlement-sync.svelte', () => ({
  parseInviteLink: mockParseInviteLink,
  createSettlement: mockCreateSettlement,
  generateInviteLink: mockGenerateInviteLink,
  SettlementSync: MockSettlementSync,
}))

vi.mock('$lib/nostr/settlement/capability', () => ({
  generateInviteToken: mockGenerateInviteToken,
}))

vi.mock('$lib/nostr/settlement/id', () => ({
  generateSettlementId: mockGenerateSettlementId,
}))

vi.mock('$app/paths', () => ({
  base: '/split-bill-calculator-on-nostr',
}))

vi.mock('$lib/nostr/settlement/storage', () => ({
  cleanupOldOwnerKeys: vi.fn(),
  loadOwnerKey: vi.fn().mockReturnValue(null),
  saveOwnerKey: vi.fn(),
}))

vi.mock('$lib/stores/btc-price.svelte', () => ({
  BtcPriceStore: class {
    price = null
    isLoading = false
    error = null
    fetch = vi.fn()
  },
}))

describe('ページルート (+page.svelte)', () => {
  beforeEach(() => {
    vi.spyOn(history, 'replaceState').mockImplementation(() => {})
    mockParseInviteLink.mockReturnValue(null)
    mockGenerateSettlementId.mockReturnValue('test-settlement-id')
    mockGenerateInviteToken.mockReturnValue('test-invite-token')
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    mockParseInviteLink.mockReturnValue(null)
  })

  describe('URLパース: モード初期化', () => {
    it('招待URLがない場合、スタンドアロンモードで表示される', async () => {
      mockParseInviteLink.mockReturnValue(null)
      render(Page)

      expect(screen.getByRole('heading', { name: 'ワリカンさん' })).toBeInTheDocument()
    })

    it('parseInviteLink は window.location.href で呼ばれる', async () => {
      mockParseInviteLink.mockReturnValue(null)
      render(Page)

      await waitFor(() => {
        expect(mockParseInviteLink).toHaveBeenCalledWith(window.location.href)
      })
    })

    it('招待URLがある場合、同期モードに遷移し見出しが非表示になる', async () => {
      mockParseInviteLink.mockReturnValue({
        settlementId: 'invite-settlement-id',
        inviteToken: 'invite-token',
      })

      render(Page)

      await waitFor(
        () => {
          expect(screen.queryByRole('heading', { name: 'ワリカンさん' })).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )
    })

    it('招待URLが invalid な場合 (null 返却)、スタンドアロンのまま', async () => {
      mockParseInviteLink.mockReturnValue(null)
      render(Page)

      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: 'ワリカンさん' })).toBeInTheDocument()
        },
        { timeout: 3000 },
      )
    })
  })

  describe('モード切替: 同期モード → スタンドアロン', () => {
    it('同期モードから戻るボタンでスタンドアロンに戻り history.replaceState が base path で呼ばれる', async () => {
      mockParseInviteLink.mockReturnValue({
        settlementId: 'test-id',
        inviteToken: 'test-token',
      })

      render(Page)

      // 同期モードになるまで待つ（タイトルが消える）
      await waitFor(
        () => {
          expect(screen.queryByRole('heading', { name: 'ワリカンさん' })).not.toBeInTheDocument()
        },
        { timeout: 3000 },
      )

      // 戻るボタンをクリック
      const backButton = screen.getByRole('button', { name: /戻る/ })
      await fireEvent.click(backButton)

      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: 'ワリカンさん' })).toBeInTheDocument()
          expect(history.replaceState).toHaveBeenCalledWith(null, '', '/split-bill-calculator-on-nostr')
        },
        { timeout: 3000 },
      )
    })
  })

  describe('精算作成フロー', () => {
    // 「新しい精算を作成」ボタンは オンライン同期タブが選択時のみ表示される
    async function switchToSyncModeAndOpenDialog() {
      const syncTabButton = screen.getByRole('button', { name: /オンライン同期/ })
      await fireEvent.click(syncTabButton)
      const createButton = await screen.findByRole('button', { name: /新しい精算を作成/ })
      await fireEvent.click(createButton)
    }

    it('オンライン同期タブを選んで精算作成ダイアログが開ける', async () => {
      render(Page)

      await switchToSyncModeAndOpenDialog()

      expect(screen.getByPlaceholderText(/例: 旅行費/)).toBeInTheDocument()
    })

    it('精算を作成するとcreateSettlementが呼ばれる', async () => {
      mockCreateSettlement.mockResolvedValue({})
      mockGenerateInviteLink.mockReturnValue('/join?s=new-id&t=new-token')

      render(Page)

      await switchToSyncModeAndOpenDialog()

      const nameInput = screen.getByPlaceholderText(/例: 旅行費/)
      await fireEvent.input(nameInput, { target: { value: 'テスト旅行' } })

      const submitButton = screen.getByRole('button', { name: /^作成$/ })
      await fireEvent.click(submitButton)

      await waitFor(
        () => {
          expect(mockCreateSettlement).toHaveBeenCalledWith(
            expect.objectContaining({
              settlementId: 'test-settlement-id',
              inviteToken: 'test-invite-token',
              name: 'テスト旅行',
            }),
          )
        },
        { timeout: 3000 },
      )
    })

    it('精算作成後に history.replaceState が招待リンクで呼ばれる', async () => {
      mockCreateSettlement.mockResolvedValue({})
      mockGenerateInviteLink.mockReturnValue('/join?s=new-id&t=new-token')

      render(Page)

      await switchToSyncModeAndOpenDialog()

      const nameInput = screen.getByPlaceholderText(/例: 旅行費/)
      await fireEvent.input(nameInput, { target: { value: 'テスト旅行' } })

      const submitButton = screen.getByRole('button', { name: /^作成$/ })
      await fireEvent.click(submitButton)

      await waitFor(
        () => {
          expect(history.replaceState).toHaveBeenCalledWith(null, '', '/join?s=new-id&t=new-token')
        },
        { timeout: 3000 },
      )
    })

    it('精算作成後にトースト通知が表示される', async () => {
      mockCreateSettlement.mockResolvedValue({})

      render(Page)

      await switchToSyncModeAndOpenDialog()

      const nameInput = screen.getByPlaceholderText(/例: 旅行費/)
      await fireEvent.input(nameInput, { target: { value: 'テスト旅行' } })

      const submitButton = screen.getByRole('button', { name: /^作成$/ })
      await fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('精算を作成しました')).toBeInTheDocument()
      })
    })
  })
})
