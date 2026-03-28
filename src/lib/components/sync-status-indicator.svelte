<script lang="ts">
  import type { ConnectionStatus } from '$lib/stores/settlement-sync.svelte'

  let {
    status
  }: {
    status: ConnectionStatus
  } = $props()

  const statusConfig: Record<ConnectionStatus, { dotClass: string; label: string }> = {
    connecting: { dotClass: 'bg-yellow-400', label: '接続中...' },
    connected: { dotClass: 'bg-green-500', label: '接続済み' },
    disconnected: { dotClass: 'bg-gray-400', label: '未接続' },
    error: { dotClass: 'bg-red-500', label: 'エラー' }
  }

  let config = $derived(statusConfig[status])
</script>

<div class="inline-flex items-center gap-1.5">
  <span class="inline-block w-2 h-2 rounded-full flex-shrink-0 {config.dotClass}"></span>
  <span class="text-sm text-gray-600 dark:text-gray-400">{config.label}</span>
</div>
