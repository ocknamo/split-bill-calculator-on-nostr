'use client'

import { Loader2, Trash2, UserPlus, Users, Zap } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchNostrProfile, isValidNpub } from '@/lib/nostr/index'
import type { Member } from '@/types/split-calculator'
import { MemberAvatar } from './member-avatar'

interface MemberListProps {
  members: Member[]
  onAddMember: (member: Member) => void
  onRemoveMember: (id: string) => void
  formatCurrency: (amount: number) => string
  getMemberPaidTotal: (memberId: string) => number
}

export function MemberList({
  members,
  onAddMember,
  onRemoveMember,
  formatCurrency,
  getMemberPaidTotal,
}: MemberListProps) {
  const [addMemberMode, setAddMemberMode] = useState<'name' | 'nostr'>('name')
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberNpub, setNewMemberNpub] = useState('')
  const [loadingNostr, setLoadingNostr] = useState(false)
  const [nostrError, setNostrError] = useState<string | null>(null)

  const addMemberByName = () => {
    if (newMemberName.trim()) {
      onAddMember({
        id: crypto.randomUUID(),
        name: newMemberName.trim(),
      })
      setNewMemberName('')
    }
  }

  const addMemberByNostr = async () => {
    if (!newMemberNpub.trim()) return

    if (!isValidNpub(newMemberNpub.trim())) {
      setNostrError('無効なnpubです。npub1...の形式で入力してください')
      return
    }

    if (members.some((m) => m.npub === newMemberNpub.trim())) {
      setNostrError('このNostrユーザーは既に登録されています')
      return
    }

    setLoadingNostr(true)
    setNostrError(null)

    let isCancelled = false
    const npubToFetch = newMemberNpub.trim()

    try {
      const profile = await fetchNostrProfile(npubToFetch)

      // Check if component is still mounted and npub hasn't changed
      if (isCancelled) return

      if (profile) {
        const displayName = profile.displayName || profile.name || 'Nostr User'
        onAddMember({
          id: crypto.randomUUID(),
          name: displayName,
          npub: npubToFetch,
          nostrProfile: profile,
        })
        setNewMemberNpub('')
      } else {
        setNostrError(
          'プロフィールを取得できませんでした。リレーに接続できないか、プロフィールが設定されていない可能性があります'
        )
      }
    } catch {
      if (!isCancelled) {
        setNostrError('プロフィールの取得中にエラーが発生しました')
      }
    } finally {
      if (!isCancelled) {
        setLoadingNostr(false)
      }
    }

    return () => {
      isCancelled = true
    }
  }

  return (
    <Card className="mb-6 border-2 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          メンバー ({members.length}人)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={addMemberMode} onValueChange={(v) => setAddMemberMode(v as 'name' | 'nostr')}>
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="name">名前で追加</TabsTrigger>
            <TabsTrigger value="nostr">Nostrで追加</TabsTrigger>
          </TabsList>
          <TabsContent value="name">
            <div className="space-y-2">
              <Label htmlFor="member-name" className="sr-only">
                メンバー名
              </Label>
              <div className="flex gap-2">
                <Input
                  id="member-name"
                  placeholder="名前を入力"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addMemberByName()}
                  className="border-2"
                  aria-describedby="member-name-hint"
                />
                <Button
                  onClick={addMemberByName}
                  disabled={!newMemberName.trim()}
                  className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                  aria-label="メンバーを追加"
                >
                  <UserPlus className="mr-1 h-4 w-4" aria-hidden="true" />
                  追加
                </Button>
              </div>
              <p id="member-name-hint" className="sr-only">
                Enterキーでも追加できます
              </p>
            </div>
          </TabsContent>
          <TabsContent value="nostr">
            <div className="space-y-3">
              <Label htmlFor="member-npub" className="sr-only">
                Nostr公開鍵
              </Label>
              <div className="flex gap-2">
                <Input
                  id="member-npub"
                  placeholder="npub1..."
                  value={newMemberNpub}
                  onChange={(e) => {
                    setNewMemberNpub(e.target.value)
                    setNostrError(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && addMemberByNostr()}
                  className="border-2 font-mono text-sm"
                  aria-describedby={nostrError ? 'nostr-error nostr-hint' : 'nostr-hint'}
                  aria-invalid={nostrError ? 'true' : undefined}
                />
                <Button
                  onClick={addMemberByNostr}
                  disabled={!newMemberNpub.trim() || loadingNostr}
                  className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                  aria-label={loadingNostr ? '読み込み中' : 'Nostrメンバーを追加'}
                >
                  {loadingNostr ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <UserPlus className="mr-1 h-4 w-4" aria-hidden="true" />
                  )}
                  追加
                </Button>
              </div>
              {nostrError && (
                <p id="nostr-error" className="text-sm text-destructive" role="alert">
                  {nostrError}
                </p>
              )}
              <p id="nostr-hint" className="text-xs text-muted-foreground">
                npubを入力するとプロフィール情報を自動取得します
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {members.length > 0 && (
          <div className="mt-4 space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border-2 border-border bg-secondary/30 p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <MemberAvatar member={member} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-foreground">{member.name}</span>
                      {member.nostrProfile?.lud16 && (
                        <Zap className="h-4 w-4 shrink-0 text-amber-500" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      支払: {formatCurrency(getMemberPaidTotal(member.id))}
                    </span>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`${member.name}を削除`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>メンバーを削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        {member.name}
                        をメンバーから削除します。この操作により、このメンバーが支払った支出も削除されます。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onRemoveMember(member.id)}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        削除する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
