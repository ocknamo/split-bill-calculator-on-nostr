<script lang="ts">
  import { Loader2 } from 'lucide-svelte'
  import type { Currency } from '$lib/types/split-calculator'

  interface Props {
    isOpen: boolean
    onClose: () => void
    onCreate: (name: string, currency: Currency) => Promise<void>
  }

  let { isOpen, onClose, onCreate }: Props = $props()

  let name = $state('')
  let currency = $state<Currency>('jpy')
  let loading = $state(false)
  let error = $state<string | null>(null)

  async function submit() {
    if (!name.trim()) return
    loading = true
    error = null
    try {
      await onCreate(name.trim(), currency)
      name = ''
      onClose()
    } catch (e) {
      error = e instanceof Error ? e.message : '作成に失敗しました'
    } finally {
      loading = false
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onclick={onClose}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="精算を作成"
  >
    <div
      class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 class="mb-4 text-lg font-bold text-gray-900">新しい精算を作成</h2>

      <div class="space-y-4">
        <div>
          <label for="settlement-name" class="mb-1 block text-sm font-medium text-gray-700"
            >精算名</label
          >
          <input
            id="settlement-name"
            type="text"
            placeholder="例: 旅行費"
            bind:value={name}
            onkeydown={(e) => e.key === 'Enter' && submit()}
            class="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label for="settlement-currency" class="mb-1 block text-sm font-medium text-gray-700"
            >通貨</label
          >
          <select
            id="settlement-currency"
            bind:value={currency}
            class="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="jpy">JPY (円)</option>
            <option value="usd">USD (ドル)</option>
          </select>
        </div>

        {#if error}
          <p class="text-sm text-red-500" role="alert">{error}</p>
        {/if}

        <div class="flex gap-3">
          <button
            onclick={onClose}
            disabled={loading}
            class="flex-1 rounded-lg border-2 border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            キャンセル
          </button>
          <button
            onclick={submit}
            disabled={!name.trim() || loading}
            class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {#if loading}
              <Loader2 class="h-4 w-4 animate-spin" />
              作成中...
            {:else}
              作成
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
