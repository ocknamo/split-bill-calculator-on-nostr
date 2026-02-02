'use client'

import { AlertTriangle, ArrowLeft, Receipt, Users } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { LightningPaymentModal } from '@/components/lightning-payment-modal'
import { CurrencySwitcher } from '@/components/split-calculator/currency-switcher'
import { ExpenseForm } from '@/components/split-calculator/expense-form'
import { ExpenseList } from '@/components/split-calculator/expense-list'
import { LockSettlementDialog } from '@/components/split-calculator/lock-settlement-dialog'
import { MemberList } from '@/components/split-calculator/member-list'
import { PriceFooter } from '@/components/split-calculator/price-footer'
import { SettlementHeader } from '@/components/split-calculator/settlement-header'
import { SettlementList } from '@/components/split-calculator/settlement-list'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useBtcPrice } from '@/hooks/use-btc-price'
import { useCurrency } from '@/hooks/use-currency'
import {
  type ConnectionStatus,
  generateInviteLink,
  useSettlementSync,
} from '@/lib/nostr/settlement/hooks'
import type { SettlementState } from '@/lib/nostr/settlement/state'

import type { Currency, Expense, Member, Settlement } from '@/types/split-calculator'

interface SplitCalculatorSyncProps {
  settlementId: string
  inviteToken: string
  onBack: () => void
}

// Convert SettlementState to UI types
function stateToMembers(state: SettlementState | null): Member[] {
  if (!state?.members) return []
  return state.members.map((m) => ({
    id: m.pubkey,
    name: m.name,
    npub: m.pubkey,
    nostrProfile:
      m.picture || m.lud16
        ? {
            name: m.name,
            picture: m.picture,
            lud16: m.lud16,
          }
        : undefined,
  }))
}

function stateToExpenses(state: SettlementState | null): Expense[] {
  if (!state?.expenses) return []
  return state.expenses.map((e) => ({
    id: e.eventId,
    description: e.note,
    amount: e.amount,
    paidById: e.memberPubkey,
    currency: (e.currency?.toLowerCase() || 'jpy') as Currency,
  }))
}

export function SplitCalculatorSync({
  settlementId,
  inviteToken,
  onBack,
}: SplitCalculatorSyncProps) {
  const [paidSettlementsArray, setPaidSettlementsArray] = useState<string[]>([])
  const paidSettlements = useMemo(() => new Set(paidSettlementsArray), [paidSettlementsArray])

  const [paymentModal, setPaymentModal] = useState<{
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

  // Sync with Nostr
  const {
    state,
    isOwner,
    isLoading,
    error: syncError,
    connectionStatus,
    addMember,
    addExpense,
    lockSettlement,
  } = useSettlementSync({
    settlementId,
    inviteToken,
  })

  // Convert state to UI types
  const members = useMemo(() => stateToMembers(state), [state])
  const expenses = useMemo(() => stateToExpenses(state), [state])

  const settlementName = state?.name || '精算'
  const settlementCurrency = (state?.currency?.toLowerCase() || 'jpy') as Currency
  const isLocked = state?.isLocked || false

  const { currency, setCurrency, formatCurrency, currencySymbol, fiatToSats, formatBtcPrice } =
    useCurrency(btcPrice, settlementCurrency, () => {})

  // Calculate settlements
  const { totalAmount, perPerson, settlements, getMemberPaidTotal } = useMemo(() => {
    if (members.length === 0 || expenses.length === 0) {
      return {
        totalAmount: 0,
        perPerson: 0,
        settlements: [],
        getMemberPaidTotal: () => 0,
      }
    }

    const total = expenses.reduce((sum, e) => sum + e.amount, 0)
    const perMember = total / members.length

    // Calculate how much each member paid
    const paid: Record<string, number> = {}
    members.forEach((m) => {
      paid[m.id] = 0
    })
    expenses.forEach((e) => {
      if (paid[e.paidById] !== undefined) {
        paid[e.paidById] += e.amount
      }
    })

    // Calculate balances (positive = should receive, negative = should pay)
    const balances: Record<string, number> = {}
    members.forEach((m) => {
      balances[m.id] = paid[m.id] - perMember
    })

    // Generate settlements
    const settlementsList: Settlement[] = []
    const debtors = members
      .filter((m) => balances[m.id] < -0.01)
      .map((m) => ({ ...m, balance: balances[m.id] }))
    const creditors = members
      .filter((m) => balances[m.id] > 0.01)
      .map((m) => ({ ...m, balance: balances[m.id] }))

    debtors.sort((a, b) => a.balance - b.balance)
    creditors.sort((a, b) => b.balance - a.balance)

    let i = 0
    let j = 0
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]
      const creditor = creditors[j]
      const amount = Math.min(-debtor.balance, creditor.balance)

      if (amount > 0.01) {
        settlementsList.push({
          id: `${debtor.id}-${creditor.id}`,
          from: debtor.id,
          to: creditor.id,
          amount: Math.round(amount),
        })
      }

      debtor.balance += amount
      creditor.balance -= amount

      if (Math.abs(debtor.balance) < 0.01) i++
      if (Math.abs(creditor.balance) < 0.01) j++
    }

    return {
      totalAmount: total,
      perPerson: perMember,
      settlements: settlementsList,
      getMemberPaidTotal: (memberId: string) => paid[memberId] || 0,
    }
  }, [members, expenses])

  // Generate invite link
  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return generateInviteLink(settlementId, inviteToken, window.location.origin)
  }, [settlementId, inviteToken])

  // Handlers
  const handleAddMember = useCallback(
    async (member: Member) => {
      // プロフィール情報も一緒に保存
      await addMember(
        member.id,
        member.name,
        member.nostrProfile?.picture,
        member.nostrProfile?.lud16
      )
    },
    [addMember]
  )

  const handleRemoveMember = useCallback((_id: string) => {
    // In sync mode, we cannot remove members (append-only)
    console.warn('Cannot remove members in sync mode')
  }, [])

  const handleAddExpense = useCallback(
    async (expense: Expense) => {
      await addExpense(
        expense.paidById,
        expense.amount,
        expense.currency.toUpperCase(),
        expense.description
      )
    },
    [addExpense]
  )

  const handleRemoveExpense = useCallback((_id: string) => {
    // In sync mode, we cannot remove expenses (append-only)
    // Instead, add a negative expense for correction
    console.warn('Cannot remove expenses in sync mode. Use negative amount for corrections.')
  }, [])

  const handleTogglePaid = useCallback((settlementId: string) => {
    setPaidSettlementsArray((prev) => {
      if (prev.includes(settlementId)) {
        return prev.filter((id) => id !== settlementId)
      }
      return [...prev, settlementId]
    })
  }, [])

  const handleOpenLightningPayment = useCallback(
    (settlement: Settlement) => {
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
    },
    [members, fiatToSats]
  )

  const handleLock = useCallback(
    async (acceptedEventIds: string[]) => {
      await lockSettlement(acceptedEventIds)
    },
    [lockSettlement]
  )

  // Prepare expenses for lock dialog
  const expensesForLock = useMemo(() => {
    return expenses.map((e) => {
      const invalidExpense = state?.invalidExpenses?.find((inv) => inv.event.id === e.id)
      const member = members.find((m) => m.id === e.paidById)
      return {
        id: e.id,
        description: e.description,
        amount: e.amount,
        memberName: member?.name || 'Unknown',
        isValid: !invalidExpense,
        invalidReason: invalidExpense?.reason,
      }
    })
  }, [expenses, members, state?.invalidExpenses])

  // Loading state
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

  const connectionStatusMap: Record<string, ConnectionStatus> = {
    connecting: 'connecting',
    connected: 'connected',
    disconnected: 'disconnected',
    error: 'error',
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Button>
        </div>

        <SettlementHeader
          name={settlementName}
          isOwner={isOwner}
          isLocked={isLocked}
          inviteLink={inviteLink}
          connectionStatus={connectionStatusMap[connectionStatus] || 'disconnected'}
          onNameChange={undefined} // Name change requires republishing settlement event
        />

        {syncError && (
          <Alert className="mb-6 border-destructive bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">{syncError}</AlertDescription>
          </Alert>
        )}

        {!isLocked && (
          <>
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
          </>
        )}

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

        {isOwner && !isLocked && expenses.length > 0 && (
          <div className="mt-6">
            <LockSettlementDialog
              expenses={expensesForLock}
              onLock={handleLock}
              formatCurrency={formatCurrency}
            />
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
