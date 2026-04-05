'use client'
import { Chip } from '@heroui/react'
import { cn } from '@/lib/utils/cn'
import { useInteractionEvent } from '@/lib/ai/interaction-events'
import type { InsightCardProps } from '@/types/components'

const SEVERITY_STYLE: Record<string, string> = {
  low: 'clay-card-success',
  medium: 'clay-card-warning',
  high: 'clay-card-danger',
}
const SEVERITY_COLOR: Record<string, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
}

export function InsightCard({ title, body, severity, actions }: InsightCardProps) {
  const dispatchEvent = useInteractionEvent()

  function handleActionClick(action: { label: string; detail: string }) {
    dispatchEvent({
      componentName: 'insight_card',
      status: 'completed',
      summary: `selected action: "${action.label}"`,
      prompt: action.detail,
      autoSend: true,
    })
  }

  return (
    <div className={cn('clay-card p-5 flex flex-col gap-3', SEVERITY_STYLE[severity])}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-base">{title}</h3>
        <Chip size="sm" color={SEVERITY_COLOR[severity]}>
          {severity}
        </Chip>
      </div>
      <p className="text-sm text-default-600 leading-relaxed">{body}</p>
      {actions.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleActionClick(action)}
              className="clay-card rounded-xl p-3 text-left hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Ask AI about: ${action.label}`}
            >
              <p className="text-sm font-semibold">{action.label}</p>
              <p className="text-xs text-default-500 mt-0.5">{action.detail}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
