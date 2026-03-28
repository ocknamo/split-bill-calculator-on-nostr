<script lang="ts">
  import type { Member } from '$lib/types/split-calculator'

  interface Props {
    member: Member
    size?: 'sm' | 'md'
  }

  let { member, size = 'md' }: Props = $props()

  const sizeClass = $derived(size === 'sm' ? 'h-6 w-6 text-xs' : 'h-9 w-9 text-sm')
  const initials = $derived(member.name.slice(0, 2).toUpperCase())
</script>

{#if member.nostrProfile?.picture}
  <img
    src={member.nostrProfile.picture}
    alt={member.name}
    class="rounded-full object-cover {sizeClass}"
  />
{:else}
  <div
    class="flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-medium text-blue-700 {sizeClass}"
  >
    {initials}
  </div>
{/if}
