<script lang="ts">
  import { Check, Copy, ExternalLink, Loader2, Zap } from 'lucide-svelte'
  import QRCode from 'qrcode'
  import { CURRENCY_SYMBOLS, SATS_PER_BTC } from '$lib/constants'
  import { fetchLightningInvoice, fetchLnurlPayInfo } from '$lib/nostr/lightning'
  import type { BtcPrice, Currency } from '$lib/types/split-calculator'

  interface Props {
    isOpen: boolean
    onClose: () => void
    lud16: string
    recipientName: string
    recipientPicture?: string
    suggestedAmount: number
    currency: Currency
    btcPrice: BtcPrice | null
  }

  let {
    isOpen,
    onClose,
    lud16,
    recipientName,
    recipientPicture,
    suggestedAmount,
    currency,
    btcPrice,
  }: Props = $props()

  let amountStr = $state('')
  let invoice = $state<string | null>(null)
  let qrDataUrl = $state<string | null>(null)
  let loading = $state(false)
  let error = $state<string | null>(null)
  let copied = $state(false)
  let lnurlInfo = $state<{
    callback: string
    minSendable: number
    maxSendable: number
  } | null>(null)

  const MAX_SATS = 21_000_000 * SATS_PER_BTC

  $effect(() => {
    if (isOpen && lud16) {
      amountStr = String(suggestedAmount)  // use suggestedAmount inside effect to capture reactively
      invoice = null
      qrDataUrl = null
      error = null
      copied = false
      lnurlInfo = null

      fetchLnurlPayInfo(lud16).then((info) => {
        lnurlInfo = info
        if (!info) error = 'Lightning Addressの情報を取得できませんでした'
      })
    }
  })

  function satsToFiat(sats: number): string {
    if (!btcPrice) return '-'
    const price = currency === 'jpy' ? btcPrice.jpy : btcPrice.usd
    const value = Math.round((sats / SATS_PER_BTC) * price)
    return `${CURRENCY_SYMBOLS[currency]}${value.toLocaleString()}`
  }

  async function generateInvoice() {
    if (!lnurlInfo) return
    const amountNum = Number(amountStr)

    if (!Number.isInteger(amountNum) || amountNum <= 0) {
      error = '1以上の整数を入力してください'
      return
    }
    if (amountNum > MAX_SATS) {
      error = '金額が大きすぎます'
      return
    }
    const amountMsat = amountNum * 1000
    if (amountMsat < lnurlInfo.minSendable || amountMsat > lnurlInfo.maxSendable) {
      error = `${Math.ceil(lnurlInfo.minSendable / 1000)}〜${Math.floor(lnurlInfo.maxSendable / 1000)} satsの範囲で入力してください`
      return
    }

    loading = true
    error = null
    try {
      const pr = await fetchLightningInvoice(lnurlInfo.callback, amountMsat)
      if (pr) {
        invoice = pr
        qrDataUrl = await QRCode.toDataURL(pr.toUpperCase(), { margin: 1, width: 200 })
      } else {
        error = 'インボイスの生成に失敗しました'
      }
    } catch {
      error = 'インボイスの生成中にエラーが発生しました'
    } finally {
      loading = false
    }
  }

  async function copyInvoice() {
    if (!invoice) return
    await navigator.clipboard.writeText(invoice)
    copied = true
    setTimeout(() => (copied = false), 2000)
  }

  function openInWallet() {
    if (invoice) window.open(`lightning:${invoice}`, '_blank')
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
    aria-label="Lightning送金"
  >
    <div
      class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 class="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
        <Zap class="h-5 w-5 text-amber-500" />
        Lightning送金
      </h2>

      <!-- Recipient -->
      <div class="mb-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3">
        {#if recipientPicture}
          <img
            src={recipientPicture}
            alt={recipientName}
            class="h-10 w-10 rounded-full object-cover"
          />
        {:else}
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700"
          >
            {recipientName.slice(0, 2).toUpperCase()}
          </div>
        {/if}
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-gray-800">{recipientName}</p>
          <p class="truncate text-xs text-gray-400">{lud16}</p>
        </div>
      </div>

      {#if !invoice}
        <!-- Amount input -->
        <div class="mb-4">
          <label for="ln-amount" class="mb-1 block text-sm font-medium text-gray-700">
            金額 (sats)
          </label>
          <input
            id="ln-amount"
            type="number"
            bind:value={amountStr}
            placeholder="0"
            class="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {#if btcPrice}
            <p class="mt-1 text-xs text-gray-400">
              約 {Number(amountStr) || 0} sats ≈ {satsToFiat(Number(amountStr) || 0)}
            </p>
          {/if}
        </div>

        {#if error}
          <p class="mb-3 text-sm text-red-500" role="alert">{error}</p>
        {/if}

        <button
          onclick={generateInvoice}
          disabled={loading || !lnurlInfo}
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-40"
        >
          {#if loading}
            <Loader2 class="h-4 w-4 animate-spin" />
            生成中...
          {:else}
            <Zap class="h-4 w-4" />
            インボイスを生成
          {/if}
        </button>
      {:else}
        <!-- QR + actions -->
        {#if qrDataUrl}
          <div class="mb-4 flex justify-center rounded-lg bg-white p-3">
            <img src={qrDataUrl} alt="Lightning Invoice QR" class="h-48 w-48" />
          </div>
        {/if}

        <div class="mb-4 text-center">
          <p class="text-2xl font-bold text-gray-900">{amountStr} sats</p>
          {#if btcPrice}
            <p class="text-sm text-gray-400">約 {satsToFiat(Number(amountStr))}</p>
          {/if}
        </div>

        <div class="mb-3 flex gap-2">
          <button
            onclick={copyInvoice}
            class="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {#if copied}
              <Check class="h-4 w-4 text-green-500" />
              コピー済み
            {:else}
              <Copy class="h-4 w-4" />
              コピー
            {/if}
          </button>
          <button
            onclick={openInWallet}
            class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            <ExternalLink class="h-4 w-4" />
            ウォレットで開く
          </button>
        </div>

        <button
          onclick={() => (invoice = null)}
          class="w-full py-1 text-sm text-gray-400 hover:text-gray-600"
        >
          金額を変更
        </button>
      {/if}
    </div>
  </div>
{/if}
