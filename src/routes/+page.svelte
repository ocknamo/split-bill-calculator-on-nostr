<script lang="ts">
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { parseInviteLink } from '$lib/stores/settlement-sync.svelte'
  import SyncModeSelector from '$lib/components/sync-mode-selector.svelte'
  import SplitCalculator from '$lib/components/split-calculator.svelte'
  import SplitCalculatorSync from '$lib/components/split-calculator-sync.svelte'

  type Mode = 'select' | 'standalone' | 'sync'

  let mode = $state<Mode>('select')
  let initialSettlementId = $state<string | null>(null)
  let initialInviteToken = $state<string | null>(null)

  onMount(() => {
    if (!browser) return
    // Check URL params for invite link
    const parsed = parseInviteLink(window.location.href)
    if (parsed) {
      initialSettlementId = parsed.settlementId
      initialInviteToken = parsed.inviteToken
      mode = 'sync'
    }
  })
</script>

<svelte:head>
  <title>ワリカンさん</title>
</svelte:head>

<div class="min-h-screen bg-background">
  {#if mode === 'select'}
    <SyncModeSelector
      onstandalone={() => { mode = 'standalone' }}
      onsync={() => { mode = 'sync' }}
    />
  {:else if mode === 'standalone'}
    <SplitCalculator />
  {:else if mode === 'sync'}
    <SplitCalculatorSync
      initialSettlementId={initialSettlementId}
      initialInviteToken={initialInviteToken}
    />
  {/if}
</div>
