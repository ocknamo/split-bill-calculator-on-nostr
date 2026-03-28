<script lang="ts">
  import type { Member, Currency, BtcPrice } from '$lib/types/split-calculator'
  import QRCode from 'qrcode'

  let { isOpen, toMember, amount, currency, btcPrice, onclose }: {
    isOpen: boolean
    toMember: Member | null
    amount: number
    currency: Currency
    btcPrice: BtcPrice | null
    onclose: () => void
  } = $props()

  let qrDataUrl = $state<string | null>(null)

  const lud16 = $derived(toMember?.nostrProfile?.lud16 ?? null)

  function formatAmount(amt: number, cur: Currency): string {
    if (cur === 'jpy') {
      return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amt)
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amt)
  }

  $effect(() => {
    if (isOpen && lud16) {
      QRCode.toDataURL(lud16, { width: 200, margin: 2 })
        .then((url) => { qrDataUrl = url })
        .catch(() => { qrDataUrl = null })
    } else {
      qrDataUrl = null
    }
  })

  function handleOpenWallet() {
    if (lud16) {
      window.open('lightning:' + lud16)
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose()
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="payment-modal-title"
    tabindex="-1"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div class="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6 flex flex-col gap-5">
      <!-- Close button -->
      <button
        type="button"
        onclick={onclose}
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        aria-label="閉じる"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>

      <!-- Title -->
      <div class="flex items-center gap-2 pr-8">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <h2 id="payment-modal-title" class="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
          {toMember?.name ?? ''}へ支払う
        </h2>
      </div>

      <!-- Amount -->
      <div class="rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">支払い金額</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {formatAmount(amount, currency)}
        </p>
        {#if btcPrice}
          {@const btcAmt = currency === 'jpy' ? amount / btcPrice.jpy : amount / btcPrice.usd}
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 tabular-nums">
            ≈ {btcAmt.toFixed(8)} BTC
          </p>
        {/if}
      </div>

      {#if lud16}
        <!-- Lightning address -->
        <div class="flex flex-col gap-3">
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lightning アドレス</p>
            <p class="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-200 break-all select-all">
              {lud16}
            </p>
          </div>

          <!-- QR code -->
          {#if qrDataUrl}
            <div class="flex justify-center">
              <img
                src={qrDataUrl}
                alt="Lightning アドレス QR コード"
                class="w-40 h-40 rounded-lg border border-gray-200 dark:border-gray-700"
              />
            </div>
          {/if}

          <!-- Open in wallet button -->
          <button
            type="button"
            onclick={handleOpenWallet}
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 px-4 py-3 text-sm font-semibold text-amber-900 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            ウォレットで開く
          </button>
        </div>
      {:else}
        <p class="text-sm text-center text-gray-500 dark:text-gray-400 py-2">
          このメンバーには Lightning アドレスが設定されていません
        </p>
      {/if}

      <!-- Close button -->
      <button
        type="button"
        onclick={onclose}
        class="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      >
        閉じる
      </button>
    </div>
  </div>
{/if}
