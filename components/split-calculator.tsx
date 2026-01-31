'use client'

import { AlertTriangle, Receipt, Users } from 'lucide-react'
import React, { useMemo } from 'react'
import { LightningPaymentModal } from '@/components/lightning-payment-modal'
import { CurrencySwitcher } from '@/components/split-calculator/currency-switcher'
import { ExpenseForm } from '@/components/split-calculator/expense-form'
import { ExpenseList } from '@/components/split-calculator/expense-list'
import { MemberList } from '@/components/split-calculator/member-list'
import { PriceFooter } from '@/components/split-calculator/price-footer'
import { SettlementList } from '@/components/split-calculator/settlement-list'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useBtcPrice } from '@/hooks/use-btc-price'
import { useCurrency } from '@/hooks/use-currency'
import { clearPersistedData, usePersistedState } from '@/hooks/use-persisted-state'
import { useSettlements } from '@/hooks/use-settlements'

import type { Currency, Expense, Member, Settlement } from '@/types/split-calculator'

interface SplitCalculatorProps {
  showHeader?: boolean
}

export function SplitCalculator({ showHeader = false }: SplitCalculatorProps) {
  const [members, setMembers, membersLoaded] = usePersistedState<Member[]>('members', [])
  const [expenses, setExpenses, expensesLoaded] = usePersistedState<Expense[]>('expenses', [])
  const [paidSettlementsArray, setPaidSettlementsArray] = usePersistedState<string[]>(
    'paidSettlements',
    []
  )
  const [savedCurrency, setSavedCurrency] = usePersistedState<Currency>('currency', 'jpy')

  // Convert array to Set for easier operations
  const paidSettlements = useMemo(() => new Set(paidSettlementsArray), [paidSettlementsArray])

  const [paymentModal, setPaymentModal] = React.useState<{
    isOpen: boolean
    lud16: string
    recipientName: string
    recipientPicture?: string
    amount: number
  }>({
    isOpen: false,
    lud16: '',
    recipientName: '',
    recipientPicture: undefined,
    amount: 0,
  })

  const {
    btcPrice,
    loading: priceLoading,
    error: priceError,
    rateLimited: priceRateLimited,
    refetch: refetchPrice,
  } = useBtcPrice()

  const handleCurrencyChange = (newCurrency: Currency) => {
    setSavedCurrency(newCurrency)
  }

  const { currency, setCurrency, formatCurrency, currencySymbol, fiatToSats, formatBtcPrice } =
    useCurrency(btcPrice, savedCurrency, handleCurrencyChange)

  const { totalAmount, perPerson, settlements, getMemberPaidTotal } = useSettlements(
    members,
    expenses
  )

  // Check for mixed currencies in expenses
  const mixedCurrencyWarning = useMemo(() => {
    if (expenses.length === 0) return null
    const currencies = new Set(expenses.map((e) => e.currency))
    if (currencies.size > 1) {
      const jpyCount = expenses.filter((e) => e.currency === 'jpy').length
      const usdCount = expenses.filter((e) => e.currency === 'usd').length
      return `支出に複数の通貨が混在しています (JPY: ${jpyCount}件, USD: ${usdCount}件)。精算結果は現在の通貨(${currency.toUpperCase()})で計算されます。`
    }
    return null
  }, [expenses, currency])

  const handleAddMember = (member: Member) => {
    setMembers([...members, member])
  }

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id))
    setExpenses(expenses.filter((e) => e.paidById !== id))
    // Clean up paidSettlements that involve the removed member
    setPaidSettlementsArray((prev) => prev.filter((settlementId) => !settlementId.includes(id)))
  }

  const handleAddExpense = (expense: Expense) => {
    setExpenses([...expenses, expense])
  }

  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter((exp) => exp.id !== id))
  }

  const handleTogglePaid = (settlementId: string) => {
    setPaidSettlementsArray((prev) => {
      if (prev.includes(settlementId)) {
        return prev.filter((id) => id !== settlementId)
      }
      return [...prev, settlementId]
    })
  }

  const handleOpenLightningPayment = (settlement: Settlement) => {
    const recipient = members.find((m) => m.id === settlement.to)
    if (recipient?.nostrProfile?.lud16) {
      setPaymentModal({
        isOpen: true,
        lud16: recipient.nostrProfile.lud16,
        recipientName: recipient.name,
        recipientPicture: recipient.nostrProfile.picture,
        amount: fiatToSats(settlement.amount),
      })
    }
  }

  const handleReset = () => {
    setMembers([])
    setExpenses([])
    setPaidSettlementsArray([])
    clearPersistedData()
  }

  // Show loading state while data is being loaded from sessionStorage
  const isLoading = !membersLoaded || !expensesLoaded

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={showHeader ? 'min-h-screen bg-background p-4 md:p-8' : ''}>
      <div className={showHeader ? 'mx-auto max-w-2xl' : ''}>
        {showHeader && (
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">ワリカンさん</h1>
            <p className="mt-2 text-muted-foreground">グループでの支払いを簡単に精算</p>
          </div>
        )}

        {mixedCurrencyWarning && (
          <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {mixedCurrencyWarning}
            </AlertDescription>
          </Alert>
        )}

        <MemberList
          members={members}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          formatCurrency={formatCurrency}
          getMemberPaidTotal={getMemberPaidTotal}
        />

        <ExpenseForm
          members={members}
          onAddExpense={handleAddExpense}
          currency={currency}
          currencySymbol={currencySymbol}
        />

        <ExpenseList
          expenses={expenses}
          members={members}
          currentCurrency={currency}
          onRemoveExpense={handleRemoveExpense}
          formatCurrency={formatCurrency}
        />

        {members.length > 0 && expenses.length > 0 && (
          <Card className="mb-6 border-2 border-border">
            <CardContent className="py-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    合計金額
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    1人あたり
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {formatCurrency(Math.round(perPerson))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <SettlementList
          settlements={settlements}
          members={members}
          paidSettlements={paidSettlements}
          onTogglePaid={handleTogglePaid}
          onOpenLightningPayment={handleOpenLightningPayment}
          formatCurrency={formatCurrency}
          fiatToSats={fiatToSats}
        />

        {members.length === 0 && (
          <Card className="border-2 border-dashed border-muted">
            <CardContent className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">まずメンバーを追加してください</p>
            </CardContent>
          </Card>
        )}

        {members.length > 0 && expenses.length === 0 && (
          <Card className="border-2 border-dashed border-muted">
            <CardContent className="py-12 text-center">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">支出を追加すると精算結果が表示されます</p>
            </CardContent>
          </Card>
        )}

        {(members.length > 0 || expenses.length > 0) && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-2 bg-transparent text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              すべてリセット
            </Button>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <CurrencySwitcher currency={currency} onCurrencyChange={setCurrency} />
        </div>

        <PriceFooter
          formattedBtcPrice={formatBtcPrice()}
          loading={priceLoading}
          error={priceError}
          rateLimited={priceRateLimited}
          onRefresh={refetchPrice}
        />
      </div>

      <LightningPaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ ...paymentModal, isOpen: false })}
        lud16={paymentModal.lud16}
        recipientName={paymentModal.recipientName}
        recipientPicture={paymentModal.recipientPicture}
        suggestedAmount={paymentModal.amount}
        currency={currency}
        btcPrice={btcPrice}
      />
    </div>
  )
}
