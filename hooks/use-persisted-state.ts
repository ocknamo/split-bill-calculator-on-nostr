"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "warikan-calculator-data"

interface PersistedData {
  members: unknown[]
  expenses: unknown[]
  paidSettlements: string[]
  currency: "jpy" | "usd"
  savedAt: string
}

export function usePersistedState<T>(
  key: keyof Omit<PersistedData, "savedAt">,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initialValue)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: PersistedData = JSON.parse(stored)
        if (parsed[key] !== undefined) {
          setValue(parsed[key] as T)
        }
      }
    } catch (error) {
      console.error("Failed to load persisted state:", error)
    }
    setIsLoaded(true)
  }, [key])

  // Save to sessionStorage when value changes
  const setPersistedValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolvedValue = typeof newValue === "function" 
          ? (newValue as (prev: T) => T)(prev) 
          : newValue

        try {
          const stored = sessionStorage.getItem(STORAGE_KEY)
          const existing: PersistedData = stored
            ? JSON.parse(stored)
            : { members: [], expenses: [], paidSettlements: [], currency: "jpy", savedAt: "" }

          existing[key] = resolvedValue as PersistedData[keyof Omit<PersistedData, "savedAt">]
          existing.savedAt = new Date().toISOString()

          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
        } catch (error) {
          console.error("Failed to persist state:", error)
        }

        return resolvedValue
      })
    },
    [key]
  )

  return [value, setPersistedValue, isLoaded]
}

export function clearPersistedData(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("Failed to clear persisted data:", error)
  }
}
