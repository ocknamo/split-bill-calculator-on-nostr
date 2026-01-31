'use client'

import { Check, Copy, Edit2, Lock, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { type ConnectionStatus, SyncStatusIndicator } from './sync-status-indicator'

interface SettlementHeaderProps {
  name: string
  isOwner: boolean
  isLocked: boolean
  inviteLink: string
  connectionStatus: ConnectionStatus
  onNameChange?: (name: string) => void
}

export function SettlementHeader({
  name,
  isOwner,
  isLocked,
  inviteLink,
  connectionStatus,
  onNameChange,
}: SettlementHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(name)
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = inviteLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveName = () => {
    if (editName.trim() && onNameChange) {
      onNameChange(editName.trim())
    }
    setIsEditing(false)
  }

  return (
    <Card className="mb-6 border-2 border-primary/50 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            {isEditing && isOwner && !isLocked ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') setIsEditing(false)
                  }}
                  className="h-8 text-lg font-bold"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveName}>
                  保存
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-bold text-foreground">{name}</h2>
                {isOwner && !isLocked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => {
                      setEditName(name)
                      setIsEditing(true)
                    }}
                    aria-label="精算名を編集"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            <div className="mt-1 flex items-center gap-2">
              <SyncStatusIndicator status={connectionStatus} />
              {isLocked && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  確定済み
                </Badge>
              )}
              {isOwner && (
                <Badge variant="outline" className="text-xs">
                  オーナー
                </Badge>
              )}
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 gap-2 bg-transparent">
                <Share2 className="h-4 w-4" />
                招待
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>メンバーを招待</DialogTitle>
                <DialogDescription>
                  以下のリンクを共有して、他の参加者を招待できます。
                  リンクを知っている人は誰でも参加できます。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input value={inviteLink} readOnly className="font-mono text-xs" />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    size="icon"
                    className="shrink-0 bg-transparent"
                    aria-label="リンクをコピー"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {copied && <p className="text-center text-sm text-green-600">コピーしました</p>}
                <p className="text-xs text-muted-foreground">
                  このリンクには招待トークンが含まれています。
                  リンクを共有された人は精算に参加し、支出を追加できます。
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
