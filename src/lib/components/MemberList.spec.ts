import { render, screen, cleanup, fireEvent } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MemberList from './MemberList.svelte'

const { mockIsValidNpub, mockFetchNostrProfile } = vi.hoisted(() => {
  return {
    mockIsValidNpub: vi.fn().mockReturnValue(false),
    mockFetchNostrProfile: vi.fn().mockResolvedValue(null),
  }
})

vi.mock('$lib/nostr/profile-rx', () => ({
  isValidNpub: mockIsValidNpub,
  fetchNostrProfile: mockFetchNostrProfile,
}))

const defaultProps = {
  members: [],
  onAddMember: vi.fn(),
  onRemoveMember: vi.fn(),
  formatCurrency: (amount: number) => `¥${amount}`,
  getMemberPaidTotal: () => 0,
}

describe('MemberList - npubバリデーション', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('npub入力が空の場合は追加ボタンがdisabledになる', async () => {
    render(MemberList, { props: defaultProps })

    const nostrTab = screen.getByRole('button', { name: 'Nostrで追加' })
    await fireEvent.click(nostrTab)

    const addButton = screen.getByRole('button', { name: '追加' })
    expect(addButton).toBeDisabled()
  })

  it('不正なnpub形式の場合は追加ボタンがdisabledになりエラーメッセージが表示される', async () => {
    mockIsValidNpub.mockReturnValue(false)
    render(MemberList, { props: defaultProps })

    const nostrTab = screen.getByRole('button', { name: 'Nostrで追加' })
    await fireEvent.click(nostrTab)

    const input = screen.getByPlaceholderText('npub1...')
    await fireEvent.input(input, { target: { value: 'invalid-format' } })

    const addButton = screen.getByRole('button', { name: '追加' })
    expect(addButton).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      '無効なnpubです。npub1...の形式で入力してください',
    )
  })

  it('有効なnpubの場合は追加ボタンがenabledになりエラーメッセージが表示されない', async () => {
    mockIsValidNpub.mockReturnValue(true)
    render(MemberList, { props: defaultProps })

    const nostrTab = screen.getByRole('button', { name: 'Nostrで追加' })
    await fireEvent.click(nostrTab)
    const input = screen.getByPlaceholderText('npub1...')
    await fireEvent.input(input, { target: { value: 'npub1validexample' } })

    const addButton = screen.getByRole('button', { name: '追加' })
    expect(addButton).not.toBeDisabled()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
