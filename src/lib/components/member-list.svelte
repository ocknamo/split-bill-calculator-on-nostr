<script lang="ts">
  import type { Member } from '$lib/types/split-calculator'
  import MemberAvatar from './member-avatar.svelte'

  let { members, isOwner = false, onadd, onremove }: {
    members: Member[]
    isOwner?: boolean
    onadd: (name: string) => void
    onremove: (id: string) => void
  } = $props()

  let newMemberName = $state('')

  function handleAdd() {
    const trimmed = newMemberName.trim()
    if (!trimmed) return
    onadd(trimmed)
    newMemberName = ''
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleAdd()
  }
</script>

<div class="flex flex-col gap-3">
  {#if members.length === 0}
    <p class="text-sm text-gray-500 dark:text-gray-400 py-2">メンバーがいません</p>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each members as member (member.id)}
        <li class="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2">
          <div class="flex items-center gap-2 min-w-0">
            <MemberAvatar {member} size="sm" />
            <span class="text-sm text-gray-800 dark:text-gray-100 truncate">{member.name}</span>
          </div>
          {#if isOwner}
            <button
              type="button"
              onclick={() => onremove(member.id)}
              class="flex-shrink-0 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded"
              aria-label="メンバーを削除"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  {#if isOwner}
    <div class="flex gap-2 mt-1">
      <input
        type="text"
        bind:value={newMemberName}
        onkeydown={handleKeydown}
        placeholder="名前を入力"
        class="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onclick={handleAdd}
        disabled={!newMemberName.trim()}
        class="flex-shrink-0 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed"
      >
        追加
      </button>
    </div>
  {/if}
</div>
