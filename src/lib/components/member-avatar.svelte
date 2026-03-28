<script lang="ts">
  import type { Member } from '$lib/types/split-calculator'

  let {
    member,
    size = 'md'
  }: {
    member: Member
    size?: 'sm' | 'md' | 'lg'
  } = $props()

  const sizeMap = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  }

  const pixelMap = {
    sm: 24,
    md: 32,
    lg: 48
  }

  let sizeClass = $derived(sizeMap[size])
  let pixelSize = $derived(pixelMap[size])
  let picture = $derived(member.nostrProfile?.picture)
  let initial = $derived(member.name ? member.name.charAt(0) : '?')
</script>

<div
  class="relative inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0 {sizeClass}"
  style="width: {pixelSize}px; height: {pixelSize}px;"
  title={member.name}
>
  {#if picture}
    <img
      src={picture}
      alt={member.name}
      class="w-full h-full object-cover"
      width={pixelSize}
      height={pixelSize}
    />
  {:else}
    <span class="font-medium text-gray-600 dark:text-gray-200 leading-none select-none">
      {initial}
    </span>
  {/if}
</div>
