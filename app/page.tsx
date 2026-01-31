'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SplitCalculator } from '@/components/split-calculator'
import { CreateSettlementDialog } from '@/components/split-calculator/create-settlement-dialog'
import { type SyncMode, SyncModeSelector } from '@/components/split-calculator/sync-mode-selector'
import { SplitCalculatorSync } from '@/components/split-calculator-sync'
import { generateInviteToken } from '@/lib/nostr/settlement/capability'
import { createSettlement, generateInviteLink, parseInviteLink } from '@/lib/nostr/settlement/hooks'
import { generateSettlementId } from '@/lib/nostr/settlement/id'
import type { Currency } from '@/types/split-calculator'

export default function Page() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [mode, setMode] = useState<SyncMode>('standalone')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [syncSession, setSyncSession] = useState<{
    settlementId: string
    inviteToken: string
  } | null>(null)

  // Check URL for invite link on mount
  useEffect(() => {
    const parsed = parseInviteLink(window.location.href)
    if (parsed) {
      setSyncSession({
        settlementId: parsed.settlementId,
        inviteToken: parsed.inviteToken,
      })
      setMode('sync')
    }
  }, [])

  const handleModeChange = useCallback(
    (newMode: SyncMode) => {
      setMode(newMode)
      if (newMode === 'standalone') {
        setSyncSession(null)
        // Clear URL params
        router.replace('/', { scroll: false })
      }
    },
    [router]
  )

  const handleCreateSettlement = useCallback(
    async (name: string, currency: Currency) => {
      // Generate new settlement
      const settlementId = generateSettlementId()
      const inviteToken = generateInviteToken()

      try {
        console.log('[v0] Creating settlement:', { settlementId, inviteToken, name, currency })

        // Create the settlement event on Nostr
        await createSettlement({
          settlementId,
          inviteToken,
          name,
          currency: currency.toUpperCase(),
        })

        console.log('[v0] Settlement created successfully')

        // Store in session
        setSyncSession({
          settlementId,
          inviteToken,
        })

        // Update URL with invite link
        const inviteLink = generateInviteLink(settlementId, inviteToken, window.location.origin)
        router.replace(inviteLink, { scroll: false })

        toast.success('精算を作成しました')
      } catch (err) {
        console.error('[v0] Failed to create settlement:', err)
        toast.error('精算の作成に失敗しました')
      }
    },
    [router]
  )

  const handleBackToSelector = useCallback(() => {
    setSyncSession(null)
    setMode('standalone')
    router.replace('/', { scroll: false })
  }, [router])

  // If in sync mode with a session, show sync calculator
  if (mode === 'sync' && syncSession) {
    return (
      <SplitCalculatorSync
        settlementId={syncSession.settlementId}
        inviteToken={syncSession.inviteToken}
        onBack={handleBackToSelector}
      />
    )
  }

  // Show mode selector and standalone calculator
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">ワリカンさん</h1>
          <p className="mt-2 text-muted-foreground">グループでの支払いを簡単に精算</p>
        </div>

        <SyncModeSelector
          mode={mode}
          onModeChange={handleModeChange}
          onCreateSettlement={() => setShowCreateDialog(true)}
        />

        {mode === 'standalone' && <SplitCalculatorContent />}

        <CreateSettlementDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreateSettlement}
        />
      </div>
    </div>
  )
}

// Extract standalone content to avoid duplication
function SplitCalculatorContent() {
  return <SplitCalculator />
}
