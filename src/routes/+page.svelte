<script lang="ts">
  import { generateInviteToken } from '$lib/nostr/settlement/capability'
  import { createSettlement, generateInviteLink, parseInviteLink } from '$lib/nostr/settlement/settlement-sync.svelte'
  import { generateSettlementId } from '$lib/nostr/settlement/id'
  import { cleanupOldOwnerKeys } from '$lib/nostr/settlement/storage'
  import { cleanupOldSettlementHistory, loadSettlementHistory, removeSettlementHistory, saveSettlementHistory } from '$lib/nostr/settlement/history'
  import type { SettlementHistoryEntry } from '$lib/nostr/settlement/history'
  import type { Currency } from '$lib/types/split-calculator'
  import { base } from '$app/paths'
  import CreateSettlementDialog from '$lib/components/CreateSettlementDialog.svelte'
  import SplitCalculator from '$lib/components/SplitCalculator.svelte'
  import SplitCalculatorSync from '$lib/components/SplitCalculatorSync.svelte'
  import SyncModeSelector, { type SyncMode } from '$lib/components/SyncModeSelector.svelte'

  type SyncSession = { settlementId: string; inviteToken: string }

  let mode = $state<SyncMode>('sync')
  let syncSession = $state<SyncSession | null>(null)
  let showCreateDialog = $state(false)
  let toast = $state<string | null>(null)
  let settlementHistory = $state<SettlementHistoryEntry[]>([])

  function showToast(msg: string) {
    toast = msg
    setTimeout(() => (toast = null), 3000)
  }

  $effect(() => {
    cleanupOldOwnerKeys()
    cleanupOldSettlementHistory()
    settlementHistory = loadSettlementHistory()
    const parsed = parseInviteLink(window.location.href)
    if (parsed) {
      syncSession = parsed
      mode = 'sync'
      saveSettlementHistory({ settlementId: parsed.settlementId, inviteToken: parsed.inviteToken, name: '' })
    }
  })

  function handleModeChange(newMode: SyncMode) {
    mode = newMode
    if (newMode === 'standalone') {
      syncSession = null
      history.replaceState(null, '', base || '/')
    }
  }

  async function handleCreate(name: string, currency: Currency) {
    const settlementId = generateSettlementId()
    const inviteToken = generateInviteToken()

    await createSettlement({ settlementId, inviteToken, name, currency: currency.toUpperCase() })

    syncSession = { settlementId, inviteToken }
    mode = 'sync'

    const link = generateInviteLink(settlementId, inviteToken, window.location.origin + base)
    history.replaceState(null, '', link)

    saveSettlementHistory({ settlementId, inviteToken, name })
    settlementHistory = loadSettlementHistory()

    showToast('精算を作成しました')
  }

  function handleBack() {
    syncSession = null
    mode = 'sync'
    history.replaceState(null, '', base || '/')
    settlementHistory = loadSettlementHistory()
  }

  function handleNameResolved(name: string) {
    if (syncSession) {
      saveSettlementHistory({ ...syncSession, name })
      settlementHistory = loadSettlementHistory()
    }
  }

  function handleSelectHistory(entry: SettlementHistoryEntry) {
    syncSession = { settlementId: entry.settlementId, inviteToken: entry.inviteToken }
    mode = 'sync'
    const link = generateInviteLink(entry.settlementId, entry.inviteToken, window.location.origin + base)
    history.replaceState(null, '', link)
    saveSettlementHistory(entry)
    settlementHistory = loadSettlementHistory()
  }

  function handleRemoveHistory(settlementId: string) {
    removeSettlementHistory(settlementId)
    settlementHistory = loadSettlementHistory()
  }
</script>

<div class="min-h-screen bg-gray-50 p-4 md:p-8">
  <div class="mx-auto max-w-2xl">
    {#if mode === 'sync' && syncSession}
      <SplitCalculatorSync
        settlementId={syncSession.settlementId}
        inviteToken={syncSession.inviteToken}
        onBack={handleBack}
        onNameResolved={handleNameResolved}
      />
    {:else}
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-bold text-gray-900 md:text-4xl">ワリカンさん</h1>
        <p class="mt-2 text-gray-500">グループでの支払いを簡単に精算</p>
      </div>

      <SyncModeSelector
        {mode}
        onModeChange={handleModeChange}
        onCreateSettlement={() => (showCreateDialog = true)}
        history={settlementHistory}
        onSelectHistory={handleSelectHistory}
        onRemoveHistory={handleRemoveHistory}
      />

      {#if mode === 'standalone'}
        <SplitCalculator />
      {/if}
    {/if}
    <footer class="mt-12 text-center text-xs text-gray-400">
      <a
        href="https://github.com/ocknamo/split-bill-calculator-on-nostr"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-gray-600"
      >
        Source Code (GitHub)
      </a>
    </footer>
  </div>
</div>

<CreateSettlementDialog
  isOpen={showCreateDialog}
  onClose={() => (showCreateDialog = false)}
  onCreate={handleCreate}
/>

<!-- Toast notification -->
{#if toast}
  <div class="fixed bottom-4 right-4 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
    {toast}
  </div>
{/if}
