<script lang="ts">
  import { generateInviteLink } from '$lib/stores/settlement-sync.svelte'

  let { settlementName, settlementId, inviteToken, baseUrl }: {
    settlementName: string
    settlementId: string
    inviteToken: string
    baseUrl: string
  } = $props()

  let copied = $state(false)
  let copyTimeoutId: ReturnType<typeof setTimeout> | null = null

  async function handleCopy() {
    const link = generateInviteLink(settlementId, inviteToken, baseUrl)
    try {
      await navigator.clipboard.writeText(link)
      copied = true
      if (copyTimeoutId !== null) clearTimeout(copyTimeoutId)
      copyTimeoutId = setTimeout(() => {
        copied = false
        copyTimeoutId = null
      }, 2000)
    } catch {
      // fallback: do nothing silently
    }
  }
</script>

<div class="flex flex-col gap-2">
  <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 break-words">{settlementName}</h1>

  <div class="flex items-center gap-2">
    <button
      type="button"
      onclick={handleCopy}
      class="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 text-sm font-medium transition-colors"
    >
      {#if copied}
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        <span class="text-green-600 dark:text-green-400">コピーしました!</span>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
        招待リンクをコピー
      {/if}
    </button>
  </div>
</div>
