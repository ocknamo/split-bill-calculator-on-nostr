"use client"

import { Button } from "@/components/ui/button"
import type { Currency } from "@/types/split-calculator"
import { CURRENCY_LABELS } from "@/lib/constants"

interface CurrencySwitcherProps {
  currency: Currency
  onCurrencyChange: (currency: Currency) => void
}

const currencies: Currency[] = ["jpy", "usd"]

export function CurrencySwitcher({ currency, onCurrencyChange }: CurrencySwitcherProps) {
  return (
    <div className="inline-flex rounded-lg border-2 border-border bg-secondary/50 p-1">
      {currencies.map((c) => (
        <Button
          key={c}
          variant={currency === c ? "default" : "ghost"}
          size="sm"
          className={`h-8 px-4 text-sm font-medium ${
            currency === c
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onCurrencyChange(c)}
        >
          {CURRENCY_LABELS[c]}
        </Button>
      ))}
    </div>
  )
}
