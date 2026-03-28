<script lang="ts">
  import { RefreshCw } from 'lucide-svelte'

  interface Props {
    formattedBtcPrice: string
    loading: boolean
    error: string | null
    rateLimited: boolean
    onRefresh: () => void
  }

  let { formattedBtcPrice, loading, error, rateLimited, onRefresh }: Props = $props()
</script>

<div class="mt-8 text-center text-xs text-gray-400">
  {#if error}
    <p class="text-red-400">
      {rateLimited ? 'レート制限中。しばらくお待ちください' : 'BTC価格の取得に失敗'}
    </p>
  {:else}
    <p>BTC: {formattedBtcPrice}</p>
  {/if}
  <button
    onclick={onRefresh}
    disabled={loading || rateLimited}
    class="mt-1 inline-flex items-center gap-1 text-gray-400 hover:text-gray-300 disabled:opacity-40"
    aria-label="BTC価格を更新"
  >
    <RefreshCw class="h-3 w-3 {loading ? 'animate-spin' : ''}" />
    更新
  </button>
</div>
