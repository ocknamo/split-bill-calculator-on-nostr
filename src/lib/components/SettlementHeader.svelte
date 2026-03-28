<script lang="ts">
  import { Check, Copy, Lock, Share2, Wifi, WifiOff, AlertCircle } from 'lucide-svelte'
  import type { ConnectionStatus } from '$lib/nostr/settlement/settlement-sync.svelte'

  interface Props {
    name: string
    isOwner: boolean
    isLocked: boolean
    inviteLink: string
    connectionStatus: ConnectionStatus
  }

  let { name, isOwner, isLocked, inviteLink, connectionStatus }: Props = $props()

  let copied = $state(false)

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink)
    copied = true
    setTimeout(() => (copied = false), 2000)
  }

  const statusColor = $derived(
    connectionStatus === 'connected'
      ? 'text-green-500'
      : connectionStatus === 'connecting'
        ? 'text-yellow-500 animate-pulse'
        : connectionStatus === 'error'
          ? 'text-red-500'
          : 'text-gray-400'
  )
  const statusLabel = $derived(
    connectionStatus === 'connected'
      ? '接続中'
      : connectionStatus === 'connecting'
        ? '接続中...'
        : connectionStatus === 'error'
          ? 'エラー'
          : '切断'
  )
</script>

<div class="mb-6 rounded-xl border-2 border-gray-200 bg-white p-4">
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <h1 class="truncate text-xl font-bold text-gray-900">{name}</h1>
        {#if isOwner}
          <span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
            >オーナー</span
          >
        {/if}
        {#if isLocked}
          <span class="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            <Lock class="h-3 w-3" />
            確定済み
          </span>
        {/if}
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <!-- Connection status -->
      {#if connectionStatus === 'error'}
        <AlertCircle class="h-4 w-4 {statusColor}" aria-label={statusLabel} />
      {:else if connectionStatus === 'disconnected'}
        <WifiOff class="h-4 w-4 {statusColor}" aria-label={statusLabel} />
      {:else}
        <Wifi class="h-4 w-4 {statusColor}" aria-label={statusLabel} />
      {/if}

      <!-- Copy invite link -->
      <button
        onclick={copyLink}
        class="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
        aria-label="招待リンクをコピー"
      >
        {#if copied}
          <Check class="h-3.5 w-3.5 text-green-500" />
          コピー済み
        {:else}
          <Share2 class="h-3.5 w-3.5" />
          招待
        {/if}
      </button>
    </div>
  </div>
</div>
