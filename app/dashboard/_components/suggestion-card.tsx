'use client'
import { useRouter } from 'next/navigation'
import { Chip } from '@heroui/react'
import { Button } from '@heroui/react'
import { Lightbulb, Play, BookOpen, CheckSquare, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { DbSuggestion } from '@/types/database'
import { useI18n } from '@/components/i18n-provider'

const TYPE_ICON: Record<string, React.ElementType> = {
  insight: Lightbulb,
  simulation: Play,
  learning: BookOpen,
  plan: CheckSquare,
}

const SEVERITY_CARD_CLASS: Record<string, string> = {
  low: 'clay-card-success',
  medium: 'clay-card-warning',
  high: 'clay-card-danger',
}

const SEVERITY_CHIP_COLOR: Record<string, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
}

interface SuggestionCardProps {
  suggestion: DbSuggestion
  onDismiss: (id: string) => void
}

export function SuggestionCard({ suggestion, onDismiss }: SuggestionCardProps) {
  const { t } = useI18n()
  const router = useRouter()
  const Icon = TYPE_ICON[suggestion.type] ?? Lightbulb

  function handleOpen() {
    if (suggestion.chat_seed) {
      sessionStorage.setItem('vela_chat_seed', suggestion.chat_seed)
    }
    router.push('/chat')
  }

  return (
    <div
      className={cn(
        'clay-card p-5 flex flex-col gap-3',
        SEVERITY_CARD_CLASS[suggestion.severity] ?? 'clay-card'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon size={15} className="shrink-0 text-default-500" />
          <h3 className="font-bold text-sm leading-snug truncate">{suggestion.title}</h3>
        </div>
        <Chip
          size="sm"
          color={SEVERITY_CHIP_COLOR[suggestion.severity] ?? 'default'}
          className="shrink-0"
        >
          {suggestion.severity}
        </Chip>
      </div>
      {suggestion.reason && (
        <p className="text-xs text-default-500 leading-relaxed">{suggestion.reason}</p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" variant="primary" onPress={handleOpen} className="clay-btn flex-1 gap-1">
          {t('dashboard.exploreChat')}
          <ArrowRight size={13} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => onDismiss(suggestion.id)}
          className="clay-btn"
        >
          {t('dashboard.dismiss')}
        </Button>
      </div>
    </div>
  )
}
