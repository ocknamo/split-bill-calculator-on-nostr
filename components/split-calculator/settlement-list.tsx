'use client'

import { ArrowRight, Calculator, Check, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import type { Member, Settlement } from '@/types/split-calculator'
import { MemberAvatar } from './member-avatar'

interface SettlementListProps {
  settlements: Settlement[]
  members: Member[]
  paidSettlements: Set<string>
  onTogglePaid: (settlementId: string) => void
  onOpenLightningPayment: (settlement: Settlement) => void
  formatCurrency: (amount: number) => string
  fiatToSats: (fiat: number) => number
}

export function SettlementList({
  settlements,
  members,
  paidSettlements,
  onTogglePaid,
  onOpenLightningPayment,
  formatCurrency,
  fiatToSats,
}: SettlementListProps) {
  const getMember = (id: string) => members.find((m) => m.id === id)
  const getMemberName = (id: string) => getMember(id)?.name || ''

  if (settlements.length === 0) return null

  return (
    <Card className="border-2 border-primary bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-primary">
          <Calculator className="h-5 w-5" />
          精算結果
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {settlements.map((settlement) => {
            const fromMember = getMember(settlement.from)
            const toMember = getMember(settlement.to)
            const hasLightning = toMember?.nostrProfile?.lud16
            const isPaid = paidSettlements.has(settlement.id)

            return (
              <li
                key={settlement.id}
                className={`rounded-lg border-2 p-4 transition-all ${
                  isPaid
                    ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
                    : 'border-primary/30 bg-background'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`paid-${settlement.id}`}
                    checked={isPaid}
                    onCheckedChange={() => onTogglePaid(settlement.id)}
                    className="mt-1 h-5 w-5 shrink-0"
                    aria-label={`${getMemberName(settlement.from)}から${getMemberName(settlement.to)}への${formatCurrency(settlement.amount)}の支払いを${isPaid ? '未払いに戻す' : '支払い済みにする'}`}
                  />
                  <div className={`min-w-0 flex-1 ${isPaid ? 'opacity-60' : ''}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {fromMember && <MemberAvatar member={fromMember} />}
                        <span
                          className={`truncate font-medium ${
                            isPaid ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {getMemberName(settlement.from)}
                        </span>
                      </div>
                      <ArrowRight
                        className={`h-4 w-4 shrink-0 ${isPaid ? 'text-muted-foreground' : 'text-primary'}`}
                      />
                      <div className="flex min-w-0 items-center gap-2">
                        {toMember && <MemberAvatar member={toMember} />}
                        <span
                          className={`truncate font-medium ${
                            isPaid ? 'line-through text-muted-foreground' : 'text-primary'
                          }`}
                        >
                          {getMemberName(settlement.to)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {isPaid && <Check className="h-5 w-5 text-green-600" />}
                      <span
                        className={`text-xl font-bold ${isPaid ? 'text-green-600' : 'text-primary'}`}
                      >
                        {formatCurrency(settlement.amount)}
                      </span>
                    </div>
                  </div>
                </div>
                {hasLightning && !isPaid && (
                  <div className="mt-3 border-t border-primary/20 pt-3">
                    <Button
                      onClick={() => onOpenLightningPayment(settlement)}
                      className="w-full bg-amber-500 text-foreground hover:bg-amber-600"
                      aria-label={`${getMemberName(settlement.to)}にLightningで${fiatToSats(settlement.amount)} satsを支払う`}
                    >
                      <Zap className="mr-2 h-4 w-4" aria-hidden="true" />
                      Lightning で支払う ({fiatToSats(settlement.amount)} sats)
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
