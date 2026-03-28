<script lang="ts">
  import { ArrowRight, Zap } from 'lucide-svelte'
  import type { Member, Settlement } from '$lib/types/split-calculator'
  import MemberAvatar from './MemberAvatar.svelte'

  interface Props {
    settlements: Settlement[]
    members: Member[]
    paidSettlements: Set<string>
    formatCurrency: (amount: number) => string
    fiatToSats: (fiat: number) => number
    onTogglePaid: (id: string) => void
    onOpenLightningPayment: (settlement: Settlement) => void
  }

  let {
    settlements,
    members,
    paidSettlements,
    formatCurrency,
    fiatToSats,
    onTogglePaid,
    onOpenLightningPayment,
  }: Props = $props()

  function getMember(id: string): Member | undefined {
    return members.find((m) => m.id === id)
  }
</script>

{#if settlements.length > 0}
  <div class="mb-6 rounded-xl border-2 border-gray-200 bg-white">
    <div class="border-b border-gray-100 px-4 py-3">
      <h2 class="font-semibold text-gray-800">精算結果</h2>
    </div>
    <ul class="divide-y divide-gray-50">
      {#each settlements as settlement (settlement.id)}
        {@const from = getMember(settlement.from)}
        {@const to = getMember(settlement.to)}
        {@const isPaid = paidSettlements.has(settlement.id)}
        {@const hasLightning = !!to?.nostrProfile?.lud16}
        <li class="px-4 py-3 {isPaid ? 'opacity-50' : ''}">
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPaid}
              onchange={() => onTogglePaid(settlement.id)}
              class="h-4 w-4 rounded border-gray-300 text-blue-600"
              aria-label="支払い済みにする"
            />
            {#if from}
              <MemberAvatar member={from} size="sm" />
            {/if}
            <span class="text-sm font-medium text-gray-700 {isPaid ? 'line-through' : ''}">
              {from?.name ?? '?'}
            </span>
            <ArrowRight class="h-4 w-4 shrink-0 text-gray-400" />
            {#if to}
              <MemberAvatar member={to} size="sm" />
            {/if}
            <span class="text-sm font-medium text-gray-700 {isPaid ? 'line-through' : ''}">
              {to?.name ?? '?'}
            </span>
            <div class="ml-auto flex items-center gap-2">
              <div class="text-right">
                <p class="text-sm font-bold text-gray-900">{formatCurrency(settlement.amount)}</p>
                <p class="text-xs text-gray-400">{fiatToSats(settlement.amount)} sats</p>
              </div>
              {#if hasLightning && !isPaid}
                <button
                  onclick={() => onOpenLightningPayment(settlement)}
                  class="rounded-full bg-amber-100 p-1.5 text-amber-600 hover:bg-amber-200"
                  aria-label="Lightningで送金"
                >
                  <Zap class="h-4 w-4" />
                </button>
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  </div>
{/if}
