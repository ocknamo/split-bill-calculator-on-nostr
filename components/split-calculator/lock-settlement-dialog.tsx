'use client'

import { AlertTriangle, Lock } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ExpenseItem {
  id: string
  description: string
  amount: number
  memberName: string
  isValid: boolean
  invalidReason?: string
}

interface LockSettlementDialogProps {
  expenses: ExpenseItem[]
  onLock: (acceptedEventIds: string[]) => void
  disabled?: boolean
  formatCurrency: (amount: number) => string
}

export function LockSettlementDialog({
  expenses,
  onLock,
  disabled = false,
  formatCurrency,
}: LockSettlementDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(expenses.filter((e) => e.isValid).map((e) => e.id))
  )
  const [isOpen, setIsOpen] = useState(false)

  const validExpenses = expenses.filter((e) => e.isValid)
  const invalidExpenses = expenses.filter((e) => !e.isValid)

  const toggleExpense = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(validExpenses.map((e) => e.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleLock = () => {
    onLock(Array.from(selectedIds))
    setIsOpen(false)
  }

  const totalSelected = expenses
    .filter((e) => selectedIds.has(e.id))
    .reduce((sum, e) => sum + e.amount, 0)

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          disabled={disabled || expenses.length === 0}
          className="w-full gap-2"
        >
          <Lock className="h-4 w-4" />
          精算を確定する
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            精算を確定しますか？
          </AlertDialogTitle>
          <AlertDialogDescription>
            確定後は新しい支出を追加できなくなります。 承認する支出を選択してください。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              承認する支出 ({selectedIds.size}/{validExpenses.length})
            </span>
            <div className="space-x-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                すべて選択
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                選択解除
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[200px] rounded-md border p-2">
            <div className="space-y-2">
              {validExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                >
                  <Checkbox
                    id={`expense-${expense.id}`}
                    checked={selectedIds.has(expense.id)}
                    onCheckedChange={() => toggleExpense(expense.id)}
                  />
                  <Label
                    htmlFor={`expense-${expense.id}`}
                    className="flex flex-1 cursor-pointer items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">{expense.memberName}</p>
                    </div>
                    <span className="shrink-0 font-mono">{formatCurrency(expense.amount)}</span>
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>

          {invalidExpenses.length > 0 && (
            <div className="rounded-md border border-amber-500/50 bg-amber-50 p-3 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                除外される支出 ({invalidExpenses.length}件)
              </div>
              <ul className="mt-2 space-y-1 text-xs text-amber-600 dark:text-amber-500">
                {invalidExpenses.map((expense) => (
                  <li key={expense.id}>
                    {expense.description} - {expense.invalidReason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-md bg-muted p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">承認する合計金額</span>
              <span className="text-lg font-bold">{formatCurrency(totalSelected)}</span>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLock}
            disabled={selectedIds.size === 0}
            className="gap-2 bg-destructive text-white hover:bg-destructive/90"
          >
            <Lock className="h-4 w-4" />
            確定する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
