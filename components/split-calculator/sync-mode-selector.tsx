'use client'

import { Plus, Users, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type SyncMode = 'standalone' | 'sync'

interface SyncModeSelectorProps {
  mode: SyncMode
  onModeChange: (mode: SyncMode) => void
  onCreateSettlement: () => void
  disabled?: boolean
}

export function SyncModeSelector({
  mode,
  onModeChange,
  onCreateSettlement,
  disabled = false,
}: SyncModeSelectorProps) {
  return (
    <Card className="mb-6 border-2 border-border">
      <CardContent className="py-4">
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as SyncMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standalone" disabled={disabled} className="gap-2">
              <Users className="h-4 w-4" />
              スタンドアロン
            </TabsTrigger>
            <TabsTrigger value="sync" disabled={disabled} className="gap-2">
              <Wifi className="h-4 w-4" />
              共同編集
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === 'sync' && (
          <div className="mt-4 space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Nostr Protocolを使用してリアルタイムで共同編集できます
            </p>
            <Button onClick={onCreateSettlement} className="w-full" disabled={disabled}>
              <Plus className="mr-2 h-4 w-4" />
              新規精算を作成
            </Button>
          </div>
        )}

        {mode === 'standalone' && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            このデバイスのみでデータを保持します
          </p>
        )}
      </CardContent>
    </Card>
  )
}
