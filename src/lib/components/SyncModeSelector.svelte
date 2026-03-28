<script lang="ts">
  import { Plus, Wifi, WifiOff } from 'lucide-svelte'

  export type SyncMode = 'standalone' | 'sync'

  interface Props {
    mode: SyncMode
    onModeChange: (m: SyncMode) => void
    onCreateSettlement: () => void
  }

  let { mode, onModeChange, onCreateSettlement }: Props = $props()
</script>

<div class="mb-6 rounded-xl border-2 border-gray-200 bg-white p-4">
  <div class="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
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
  </div>

  {#if mode === 'standalone'}
    <p class="text-center text-xs text-gray-500">データはこのデバイスにのみ保存されます</p>
  {:else}
    <p class="mb-3 text-center text-xs text-gray-500">
      Nostrプロトコルで複数デバイス間でリアルタイム同期
    </p>
    <button
      onclick={onCreateSettlement}
      class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      <Plus class="h-4 w-4" />
      新しい精算を作成
    </button>
  {/if}
</div>
