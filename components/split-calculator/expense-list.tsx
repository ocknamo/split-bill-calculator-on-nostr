"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { MemberAvatar } from "./member-avatar"
import type { Member, Expense, Currency } from "@/types/split-calculator"
import { Badge } from "@/components/ui/badge"

interface ExpenseListProps {
  expenses: Expense[]
  members: Member[]
  currentCurrency: Currency
  onRemoveExpense: (id: string) => void
  formatCurrency: (amount: number) => string
}

export function ExpenseList({
  expenses,
  members,
  currentCurrency,
  onRemoveExpense,
  formatCurrency,
}: ExpenseListProps) {
  const getMember = (id: string) => members.find((m) => m.id === id)
  const getMemberName = (id: string) => getMember(id)?.name || ""

  if (expenses.length === 0) return null

  return (
    <Card className="mb-6 border-2 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">支出一覧</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {expenses.map((expense) => {
            const payer = getMember(expense.paidById)
            return (
              <li
                key={expense.id}
                className="flex items-center justify-between rounded-lg border-2 border-border bg-secondary/30 p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {payer && <MemberAvatar member={payer} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground">{expense.description}</p>
                      {expense.currency && expense.currency !== currentCurrency && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {expense.currency.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {getMemberName(expense.paidById)} が {formatCurrency(expense.amount)} 支払い
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`${expense.description}を削除`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>支出を削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        「{expense.description}」（{formatCurrency(expense.amount)}）を削除します。この操作は取り消せません。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onRemoveExpense(expense.id)}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        削除する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
