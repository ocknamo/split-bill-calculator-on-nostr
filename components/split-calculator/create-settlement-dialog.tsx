'use client'

import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Currency } from '@/types/split-calculator'

interface CreateSettlementDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, currency: Currency) => Promise<void>
}

export function CreateSettlementDialog({ isOpen, onClose, onCreate }: CreateSettlementDialogProps) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<Currency>('jpy')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('精算名を入力してください')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      await onCreate(name.trim(), currency)
      setName('')
      setCurrency('jpy')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      setName('')
      setCurrency('jpy')
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新規精算を作成</DialogTitle>
          <DialogDescription>
            共同編集用の精算を作成します。 作成後、招待リンクを共有してメンバーを招待できます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="settlement-name">精算名</Label>
            <Input
              id="settlement-name"
              placeholder="例: 沖縄旅行"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) {
                  handleCreate()
                }
              }}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settlement-currency">通貨</Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as Currency)}
              disabled={isCreating}
            >
              <SelectTrigger id="settlement-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpy">JPY (日本円)</SelectItem>
                <SelectItem value="usd">USD (米ドル)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
            className="bg-transparent"
          >
            キャンセル
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                作成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
