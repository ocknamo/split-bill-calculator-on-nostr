'use client'

import { AlertCircle, Loader2, Wifi, WifiOff } from 'lucide-react'
import type React from 'react'
import type { ConnectionStatus } from '@/lib/nostr/settlement/hooks'
import { cn } from '@/lib/utils'

export type { ConnectionStatus }

interface SyncStatusIndicatorProps {
  status: ConnectionStatus
  className?: string
}

const statusConfig: Record<
  ConnectionStatus,
  { icon: React.ElementType; label: string; color: string }
> = {
  connecting: {
    icon: Loader2,
    label: '接続中...',
    color: 'text-amber-500',
  },
  connected: {
    icon: Wifi,
    label: '接続済み',
    color: 'text-green-500',
  },
  disconnected: {
    icon: WifiOff,
    label: '未接続',
    color: 'text-muted-foreground',
  },
  error: {
    icon: AlertCircle,
    label: '接続エラー',
    color: 'text-destructive',
  },
}

export function SyncStatusIndicator({ status, className }: SyncStatusIndicatorProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn('flex items-center gap-1 text-xs', config.color, className)}
      role="status"
      aria-live="polite"
    >
      <Icon
        className={cn('h-3 w-3', status === 'connecting' && 'animate-spin')}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </div>
  )
}
