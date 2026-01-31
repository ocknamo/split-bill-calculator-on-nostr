"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle, Clock } from "lucide-react"

interface PriceFooterProps {
  formattedBtcPrice: string
  loading: boolean
  error?: string | null
  rateLimited?: boolean
  onRefresh: () => void
}

export function PriceFooter({
  formattedBtcPrice,
  loading,
  error,
  rateLimited,
  onRefresh,
}: PriceFooterProps) {
  return (
    <footer className="mt-8 border-t border-border pt-6">
      <div className="flex flex-col items-center gap-2 text-center">
        {error ? (
          <div
            className="flex flex-wrap items-center justify-center gap-2 text-sm text-destructive"
            role="alert"
          >
            {rateLimited ? (
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className="text-center">{error}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 bg-transparent px-2 text-xs"
              onClick={onRefresh}
              disabled={loading || rateLimited}
              aria-label="価格を再取得"
            >
              <RefreshCw
                className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              再試行
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">1 BTC = {formattedBtcPrice}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 bg-transparent px-2 text-xs"
              onClick={onRefresh}
              disabled={loading}
              aria-label="価格を更新"
            >
              <RefreshCw
                className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              更新
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground/60">価格データ: CoinGecko API</p>
      </div>
    </footer>
  )
}
