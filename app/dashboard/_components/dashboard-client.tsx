'use client'
import { useState } from 'react'
import { Button } from '@heroui/react'
import { RefreshCw } from 'lucide-react'
import { SuggestionCard } from './suggestion-card'
import type { DbSuggestion } from '@/types/database'
import { useI18n } from '@/components/i18n-provider'

interface DashboardClientProps {
  initialSuggestions: DbSuggestion[]
}

export function DashboardClient({ initialSuggestions }: DashboardClientProps) {
  const { t } = useI18n()
  const [suggestions, setSuggestions] = useState<DbSuggestion[]>(initialSuggestions)
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/suggestions', { method: 'POST' })
      if (!res.ok) return
      const data: DbSuggestion[] = await res.json()
      setSuggestions(data)
    } finally {
      setRefreshing(false)
    }
  }

  async function dismiss(id: string) {
    const res = await fetch('/api/suggestions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t('dashboard.suggests')}</h2>
        <Button
          size="sm"
          variant="ghost"
          isDisabled={refreshing}
          onPress={refresh}
          className="clay-btn gap-1"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {t('common.refresh')}
        </Button>
      </div>

      {suggestions.length === 0 ? (
        <div className="clay-card p-8 flex flex-col items-center gap-3 text-center">
          <p className="text-default-400 text-sm">{t('dashboard.noSuggestions')}</p>
          <Button
            size="sm"
            variant="outline"
            onPress={refresh}
            isDisabled={refreshing}
            className="clay-btn"
          >
            {t('dashboard.generateSuggestions')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </section>
  )
}
