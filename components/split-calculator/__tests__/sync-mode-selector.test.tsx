import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SyncModeSelector } from '../sync-mode-selector'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

describe('SyncModeSelector', () => {
  it('renders two mode options', () => {
    render(
      <SyncModeSelector mode="standalone" onModeChange={vi.fn()} onCreateSettlement={vi.fn()} />
    )

    expect(screen.getByText('スタンドアロン')).toBeInTheDocument()
    expect(screen.getByText('共同編集')).toBeInTheDocument()
  })

  it('calls onModeChange when mode is switched', async () => {
    const onModeChange = vi.fn()
    const user = userEvent.setup()
    render(
      <SyncModeSelector
        mode="standalone"
        onModeChange={onModeChange}
        onCreateSettlement={vi.fn()}
      />
    )

    const syncTab = screen.getByRole('tab', { name: /共同編集/i })
    await user.click(syncTab)
    expect(onModeChange).toHaveBeenCalledWith('sync')
  })

  it('shows create settlement button in sync mode', () => {
    render(<SyncModeSelector mode="sync" onModeChange={vi.fn()} onCreateSettlement={vi.fn()} />)

    expect(screen.getByText('新規精算を作成')).toBeInTheDocument()
  })

  it('calls onCreateSettlement when create button is clicked', () => {
    const onCreateSettlement = vi.fn()
    render(
      <SyncModeSelector
        mode="sync"
        onModeChange={vi.fn()}
        onCreateSettlement={onCreateSettlement}
      />
    )

    fireEvent.click(screen.getByText('新規精算を作成'))
    expect(onCreateSettlement).toHaveBeenCalled()
  })
})
