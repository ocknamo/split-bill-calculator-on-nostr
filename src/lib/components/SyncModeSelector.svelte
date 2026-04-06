<script lang="ts">
  import { Plus, Wifi, WifiOff, X } from 'lucide-svelte'
  import type { SettlementHistoryEntry } from '$lib/nostr/settlement/history'

  export type SyncMode = 'standalone' | 'sync'

  interface Props {
    mode: SyncMode
    onModeChange: (m: SyncMode) => void
    onCreateSettlement: () => void
    history?: SettlementHistoryEntry[]
    onSelectHistory?: (entry: SettlementHistoryEntry) => void
    onRemoveHistory?: (settlementId: string) => void
  }

  let { mode, onModeChange, onCreateSettlement, history = [], onSelectHistory, onRemoveHistory }: Props = $props()

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('ja-JP')
  }
</script>

<div class="mb-6 rounded-xl border-2 border-gray-200 bg-white p-4">
  <div class="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
    <button
      onclick={() => onModeChange('sync')}
      class="flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors {mode ===
      'sync'
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-500 hover:text-gray-700'}"
    >
      <Wifi class="h-4 w-4" />
      Nostr同期
    </button>
    <button
      onclick={() => onModeChange('standalone')}
      class="flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors {mode ===
      'standalone'
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-500 hover:text-gray-700'}"
    >
      <WifiOff class="h-4 w-4" />
      スタンドアロン
    </button>
  </div>

  {#if mode === 'standalone'}
    <p class="text-center text-xs text-gray-500">データはこのデバイスにのみ保存されます</p>
  {:else}
    <p class="mb-2 text-center text-xs text-gray-500">
      Nostrプロトコルで複数デバイス間でリアルタイム同期
    </p>
    <p class="mb-3 text-center text-xs text-amber-600">
      ⚠ ネットワーク上に共有されるので個人情報は載せないように注意してください
    </p>
    <button
      onclick={onCreateSettlement}
      class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      <Plus class="h-4 w-4" />
      新しい精算を作成
    </button>

    {#if history.length > 0}
      <div class="mt-4 border-t border-gray-100 pt-3">
        <p class="mb-2 text-xs font-medium text-gray-500">過去の精算</p>
        <ul class="space-y-2">
          {#each history as entry (entry.settlementId)}
            <li class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <button
                onclick={() => onSelectHistory?.(entry)}
                class="flex-1 text-left text-sm text-gray-800 hover:text-blue-600"
              >
                {entry.name || '(名称なし)'}
                <span class="ml-2 text-xs text-gray-400">
                  {formatDate(entry.lastAccessedAt)}
                </span>
              </button>
              <button
                onclick={() => onRemoveHistory?.(entry.settlementId)}
                class="ml-2 text-gray-300 hover:text-red-500"
                aria-label="削除"
              >
                <X class="h-4 w-4" />
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {/if}
</div>
