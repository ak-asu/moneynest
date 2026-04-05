// app/budget/_components/profile-sync-banner.tsx
'use client'
import { Button } from '@heroui/react'
import { RefreshCw } from 'lucide-react'

interface ProfileSyncBannerProps {
  suggestedExpenses: Record<string, number>
  confirming: boolean
  onConfirm: () => void
  onDismiss: () => void
}

export function ProfileSyncBanner({
  suggestedExpenses,
  confirming,
  onConfirm,
  onDismiss,
}: ProfileSyncBannerProps) {
  const top3 = Object.entries(suggestedExpenses)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat, amt]) => `${cat} $${Math.round(amt)}`)
    .join(', ')

  return (
    <div
      role="alert"
      className="clay-card border border-warning-200 bg-warning-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <RefreshCw size={16} className="shrink-0 text-warning-600 mt-0.5 sm:mt-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-warning-800">
          Your budget data suggests different expenses than your profile
        </p>
        {top3 && (
          <p className="text-xs text-warning-700 mt-0.5 truncate">
            Suggested: {top3}
          </p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          size="sm"
          variant="primary"
          isDisabled={confirming}
          onPress={onConfirm}
          className="clay-btn"
        >
          {confirming ? 'Updating…' : 'Update profile'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          isDisabled={confirming}
          onPress={onDismiss}
          className="clay-btn"
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}
