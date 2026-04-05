<script lang="ts">
  import { Loader2, Trash2, UserPlus, Users, Zap } from 'lucide-svelte'
  import { isValidNpub, fetchNostrProfile } from '$lib/nostr/profile-rx'
  import type { Member } from '$lib/types/split-calculator'
  import { resolveUniqueName } from '$lib/utils/member-name'
  import MemberAvatar from './MemberAvatar.svelte'

  interface Props {
    members: Member[]
    onAddMember: (member: Member) => void | Promise<void>
    onRemoveMember: (id: string) => void
    formatCurrency: (amount: number) => string
    getMemberPaidTotal: (memberId: string) => number
  }

  let { members, onAddMember, onRemoveMember, formatCurrency, getMemberPaidTotal }: Props =
    $props()

  let addMode = $state<'name' | 'nostr'>('name')
  let newName = $state('')
  let newNpub = $state('')
  let loadingNostr = $state(false)
  let nostrError = $state<string | null>(null)
  let confirmDeleteId = $state<string | null>(null)

  function addByName() {
    const name = newName.trim().slice(0, 30)
    if (!name) return
    const uniqueName = resolveUniqueName(name, members)
    onAddMember({ id: crypto.randomUUID(), name: uniqueName })
    newName = ''
  }

  async function addByNostr() {
    if (!newNpub.trim()) return
    if (!isValidNpub(newNpub.trim())) {
      nostrError = '無効なnpubです。npub1...の形式で入力してください'
      return
    }
    if (members.some((m) => m.npub === newNpub.trim())) {
      nostrError = 'このNostrユーザーは既に登録されています'
      return
    }

    loadingNostr = true
    nostrError = null
    const npub = newNpub.trim()

    try {
      const profile = await fetchNostrProfile(npub)
      if (profile) {
        await onAddMember({
          id: crypto.randomUUID(),
          name: profile.displayName || profile.name || 'Nostr User',
          npub,
          nostrProfile: profile,
        })
        newNpub = ''
      } else {
        nostrError = 'プロフィールを取得できませんでした'
      }
    } catch {
      nostrError = 'プロフィールの取得中にエラーが発生しました'
    } finally {
      loadingNostr = false
    }
  }
</script>

<div class="mb-6 rounded-xl border-2 border-gray-200 bg-white">
  <div class="border-b border-gray-100 px-4 py-3">
    <h2 class="flex items-center gap-2 font-semibold text-gray-800">
      <Users class="h-5 w-5 text-blue-600" />
      メンバー ({members.length}人)
    </h2>
  </div>
  <div class="p-4">
    <!-- Tab switcher -->
    <div class="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
      <button
        onclick={() => {
          addMode = 'name'
          nostrError = null
        }}
        class="rounded-md py-1.5 text-sm font-medium {addMode === 'name'
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500'}"
      >
        名前で追加
      </button>
      <button
        onclick={() => {
          addMode = 'nostr'
          nostrError = null
        }}
        class="rounded-md py-1.5 text-sm font-medium {addMode === 'nostr'
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500'}"
      >
        Nostrで追加
      </button>
    </div>

    {#if addMode === 'name'}
      <div class="flex gap-2">
        <input
          type="text"
          placeholder="名前を入力"
          maxlength="30"
          bind:value={newName}
          onkeydown={(e) => e.key === 'Enter' && addByName()}
          class="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          onclick={addByName}
          disabled={!newName.trim()}
          class="flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
        >
          <UserPlus class="h-4 w-4" />
          追加
        </button>
      </div>
    {:else}
      <div class="space-y-2">
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="npub1..."
            bind:value={newNpub}
            oninput={() => {
              const val = newNpub.trim()
              if (val && !isValidNpub(val)) {
                nostrError = '無効なnpubです。npub1...の形式で入力してください'
              } else {
                nostrError = null
              }
            }}
            onkeydown={(e) => e.key === 'Enter' && addByNostr()}
            class="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none {nostrError
              ? 'border-red-400'
              : ''}"
          />
          <button
            onclick={addByNostr}
            disabled={!newNpub.trim() || !isValidNpub(newNpub.trim()) || loadingNostr}
            class="flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {#if loadingNostr}
              <Loader2 class="h-4 w-4 animate-spin" />
            {:else}
              <UserPlus class="h-4 w-4" />
            {/if}
            追加
          </button>
        </div>
        {#if nostrError}
          <p class="text-sm text-red-500" role="alert">{nostrError}</p>
        {:else}
          <p class="text-xs text-gray-400">npubを入力するとプロフィール情報を自動取得します</p>
        {/if}
      </div>
    {/if}

    {#if members.length > 0}
      <ul class="mt-4 space-y-2">
        {#each members as member (member.id)}
          <li
            class="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
          >
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <MemberAvatar {member} />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="truncate text-sm font-medium text-gray-800">{member.name}</span>
                  {#if member.nostrProfile?.lud16}
                    <Zap class="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  {/if}
                </div>
                <span class="text-xs text-gray-400">
                  支払: {formatCurrency(getMemberPaidTotal(member.id))}
                </span>
              </div>
            </div>
            <button
              onclick={() => (confirmDeleteId = member.id)}
              class="ml-2 rounded p-1 text-gray-400 hover:text-red-500"
              aria-label="{member.name}を削除"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<!-- Confirm delete dialog -->
{#if confirmDeleteId !== null}
  {@const target = members.find((m) => m.id === confirmDeleteId)}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onclick={() => (confirmDeleteId = null)}
    onkeydown={(e) => e.key === 'Escape' && (confirmDeleteId = null)}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
  >
    <div
      class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      onclick={(e) => e.stopPropagation()}
    >
      <h3 class="mb-2 font-semibold text-gray-900">メンバーを削除しますか？</h3>
      <p class="mb-6 text-sm text-gray-500">
        {target?.name}をメンバーから削除します。この操作によりこのメンバーの支出も削除されます。
      </p>
      <div class="flex gap-3">
        <button
          onclick={() => (confirmDeleteId = null)}
          class="flex-1 rounded-lg border-2 border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          onclick={() => {
            if (confirmDeleteId) onRemoveMember(confirmDeleteId)
            confirmDeleteId = null
          }}
          class="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          削除する
        </button>
      </div>
    </div>
  </div>
{/if}
