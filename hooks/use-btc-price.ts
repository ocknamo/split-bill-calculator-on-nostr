"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { BtcPrice } from "@/types/split-calculator"
import { COINGECKO_API_URL } from "@/lib/constants"

const RATE_LIMIT_COOLDOWN_MS = 60000 // 1 minute cooldown after rate limit
const MIN_FETCH_INTERVAL_MS = 10000 // Minimum 10 seconds between fetches

export function useBtcPrice() {
  const [btcPrice, setBtcPrice] = useState<BtcPrice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const lastFetchTime = useRef<number>(0)
  const rateLimitEndTime = useRef<number>(0)

  const fetchPrice = useCallback(async (force = false) => {
    const now = Date.now()

    // Check if we're rate limited
    if (rateLimitEndTime.current > now) {
      const remainingSeconds = Math.ceil((rateLimitEndTime.current - now) / 1000)
      setError(`レート制限中です。${remainingSeconds}秒後に再試行してください`)
      return
    }

    // Prevent too frequent requests (unless forced)
    if (!force && now - lastFetchTime.current < MIN_FETCH_INTERVAL_MS) {
      return
    }

    setLoading(true)
    setError(null)
    setRateLimited(false)

    try {
      const res = await fetch(COINGECKO_API_URL)

      // Handle rate limiting (429 Too Many Requests)
      if (res.status === 429) {
        rateLimitEndTime.current = now + RATE_LIMIT_COOLDOWN_MS
        setRateLimited(true)
        setError("APIのレート制限に達しました。1分後に再試行してください")
        setLoading(false)
        return
      }

      // Handle other HTTP errors
      if (!res.ok) {
        throw new Error(`HTTP error: ${res.status}`)
      }

      const data = await res.json()

      if (data?.bitcoin?.jpy && data?.bitcoin?.usd) {
        setBtcPrice({ jpy: data.bitcoin.jpy, usd: data.bitcoin.usd })
        lastFetchTime.current = now
        setError(null)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー"
      setError(`価格の取得に失敗しました: ${message}`)
      // Keep existing price if available
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrice(true)
  }, [fetchPrice])

  return {
    btcPrice,
    loading,
    error,
    rateLimited,
    refetch: () => fetchPrice(true),
  }
}
