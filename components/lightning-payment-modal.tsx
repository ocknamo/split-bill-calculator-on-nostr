'use client'

import { Check, Copy, ExternalLink, Loader2, Zap } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { RecipientAvatar } from '@/components/recipient-avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CURRENCY_SYMBOLS, SATS_PER_BTC } from '@/lib/constants'
import { fetchLightningInvoice, fetchLnurlPayInfo } from '@/lib/nostr/lightning'

interface LightningPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  lud16: string
  recipientName: string
  recipientPicture?: string
  suggestedAmount: number
  currency: 'jpy' | 'usd'
  btcPrice: { jpy: number; usd: number } | null
}

export function LightningPaymentModal({
  isOpen,
  onClose,
  lud16,
  recipientName,
  recipientPicture,
  suggestedAmount,
  currency,
  btcPrice,
}: LightningPaymentModalProps) {
  const [amount, setAmount] = useState(suggestedAmount.toString())
  const [invoice, setInvoice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [lnurlInfo, setLnurlInfo] = useState<{
    callback: string
    minSendable: number
    maxSendable: number
  } | null>(null)

  useEffect(() => {
    if (isOpen && lud16) {
      setAmount(suggestedAmount.toString())
      setInvoice(null)
      setError(null)
      setCopied(false)

      fetchLnurlPayInfo(lud16).then((info) => {
        setLnurlInfo(info)
        if (!info) {
          setError('Lightning Addressの情報を取得できませんでした')
        }
      })
    }
  }, [isOpen, lud16, suggestedAmount])

  const satsToFiat = (sats: number): string => {
    if (!btcPrice) return '-'
    const price = currency === 'jpy' ? btcPrice.jpy : btcPrice.usd
    const value = Math.round((sats / SATS_PER_BTC) * price)
    return `${CURRENCY_SYMBOLS[currency]}${value.toLocaleString()}`
  }

  const MAX_SATS = 21_000_000 * SATS_PER_BTC // Total Bitcoin supply in sats

  const generateInvoice = async () => {
    if (!lnurlInfo) return

    const amountNum = Number(amount)

    // Comprehensive validation
    if (Number.isNaN(amountNum)) {
      setError('有効な数値を入力してください')
      return
    }

    if (amountNum <= 0) {
      setError('金額は1 sats以上を入力してください')
      return
    }

    if (!Number.isInteger(amountNum)) {
      setError('金額は整数で入力してください')
      return
    }

    if (amountNum > MAX_SATS) {
      setError('金額が大きすぎます')
      return
    }

    const amountMsat = amountNum * 1000
    if (amountMsat < lnurlInfo.minSendable || amountMsat > lnurlInfo.maxSendable) {
      setError(
        `金額は ${Math.ceil(lnurlInfo.minSendable / 1000)} から ${Math.floor(lnurlInfo.maxSendable / 1000)} satsの範囲で入力してください`
      )
      return
    }

    setLoading(true)
    setError(null)

    try {
      const pr = await fetchLightningInvoice(lnurlInfo.callback, amountMsat)
      if (pr) {
        setInvoice(pr)
      } else {
        setError('インボイスの生成に失敗しました')
      }
    } catch {
      setError('インボイスの生成中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const copyInvoice = async () => {
    if (invoice) {
      await navigator.clipboard.writeText(invoice)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openInWallet = () => {
    if (invoice) {
      window.open(`lightning:${invoice}`, '_blank')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-2 border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Zap className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Lightning送金
          </DialogTitle>
          <DialogDescription className="sr-only">
            {recipientName}へLightning Networkで送金します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-secondary/50 p-4">
            <p className="mb-2 text-center text-sm text-muted-foreground">送金先</p>
            <div className="flex items-center justify-center gap-3">
              <RecipientAvatar picture={recipientPicture} name={recipientName} />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{recipientName}</p>
                <p className="truncate text-xs text-muted-foreground">{lud16}</p>
              </div>
            </div>
          </div>

          {!invoice ? (
            <>
              <div>
                <Label htmlFor="amount" className="text-sm font-medium">
                  金額 (sats)
                </Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="金額を入力"
                    className="border-2"
                  />
                </div>
                {btcPrice && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    約 {Number(amount) || 0} sats = 約 {satsToFiat(Number(amount) || 0)}
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button
                onClick={generateInvoice}
                disabled={loading || !lnurlInfo}
                className="w-full bg-amber-500 text-foreground hover:bg-amber-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    インボイスを生成
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex justify-center rounded-lg bg-card p-4">
                <QRCodeSVG value={invoice.toUpperCase()} size={200} level="M" includeMargin />
              </div>

              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{amount} sats</p>
                {btcPrice && (
                  <p className="text-sm text-muted-foreground">
                    約 {satsToFiat(Number(amount) || 0)}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={copyInvoice}
                  className="flex-1 border-2 bg-transparent"
                  aria-label={
                    copied ? 'インボイスをコピー済み' : 'インボイスをクリップボードにコピー'
                  }
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                      コピー
                    </>
                  )}
                </Button>
                <Button
                  onClick={openInWallet}
                  className="flex-1 bg-amber-500 text-foreground hover:bg-amber-600"
                  aria-label="Lightningウォレットでインボイスを開く"
                >
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  ウォレットで開く
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => setInvoice(null)}
                className="w-full text-muted-foreground"
              >
                金額を変更
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
