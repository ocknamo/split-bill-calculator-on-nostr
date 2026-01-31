'use client'

import { Receipt } from 'lucide-react'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Currency, Expense, Member } from '@/types/split-calculator'

interface ExpenseFormProps {
  members: Member[]
  onAddExpense: (expense: Expense) => void
  currency: Currency
  currencySymbol: string
}

export function ExpenseForm({ members, onAddExpense, currency, currencySymbol }: ExpenseFormProps) {
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    paidById: '',
  })

  const addExpense = () => {
    if (newExpense.description && newExpense.amount && newExpense.paidById) {
      onAddExpense({
        id: crypto.randomUUID(),
        description: newExpense.description,
        amount: Number(newExpense.amount),
        paidById: newExpense.paidById,
        currency: currency,
      })
      setNewExpense({ description: '', amount: '', paidById: '' })
    }
  }

  return (
    <Card className="mb-6 border-2 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          支出を追加
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="paidBy" className="text-sm font-medium">
              支払った人
            </Label>
            <Select
              value={newExpense.paidById}
              onValueChange={(value) => setNewExpense({ ...newExpense, paidById: value })}
              disabled={members.length === 0}
            >
              <SelectTrigger
                id="paidBy"
                className="mt-1 border-2"
                aria-describedby={members.length === 0 ? 'paidby-hint' : undefined}
              >
                <SelectValue
                  placeholder={members.length === 0 ? '先にメンバーを追加' : '選択してください'}
                />
              </SelectTrigger>
              {members.length === 0 && (
                <p id="paidby-hint" className="sr-only">
                  メンバーを追加してから選択してください
                </p>
              )}
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex max-w-[200px] items-center gap-2">
                      {member.nostrProfile?.picture && (
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarImage
                            src={member.nostrProfile.picture || '/placeholder.svg'}
                            alt={member.name}
                          />
                          <AvatarFallback className="text-xs">
                            {member.name.slice(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="truncate">{member.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              内容
            </Label>
            <Input
              id="description"
              placeholder="例：ランチ代"
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              className="mt-1 border-2"
            />
          </div>
          <div>
            <Label htmlFor="amount" className="text-sm font-medium">
              金額 ({currency.toUpperCase()})
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                className="border-2 pl-8"
              />
            </div>
          </div>
          <Button
            onClick={addExpense}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!newExpense.description || !newExpense.amount || !newExpense.paidById}
          >
            追加する
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
