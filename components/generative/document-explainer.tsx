'use client'
import { Button, Chip } from '@heroui/react'
import { Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useInteractionEvent } from '@/lib/ai/interaction-events'
import type { DocumentExplainerProps } from '@/types/components'

const RISK_STYLE: Record<string, string> = {
  low: 'clay-card-success',
  medium: 'clay-card-warning',
  high: 'clay-card-danger',
}
const RISK_COLOR: Record<string, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
}

export function DocumentExplainer({
  title,
  summary,
  clauses,
  what_ifs,
  voice_enabled,
  document_type,
}: DocumentExplainerProps) {
  const dispatchEvent = useInteractionEvent()

  function handleWhatIfClick(whatIf: { label: string; simulation_id: string }) {
    dispatchEvent({
      componentName: 'document_explainer',
      status: 'completed',
      summary: `selected what-if: "${whatIf.label}"`,
      prompt: `Let's explore this scenario from my ${document_type} document: ${whatIf.label}. Use simulation id ${whatIf.simulation_id} if relevant and walk me through likely impact and next steps.`,
      autoSend: true,
    })
  }

  return (
    <div className="clay-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-default-400 uppercase tracking-wide">{document_type}</p>
          <h3 className="font-bold text-base">{title}</h3>
        </div>
        {voice_enabled && (
          <Button size="sm" variant="secondary" className="clay-btn">
            <Volume2 size={14} />
            Listen
          </Button>
        )}
      </div>
      <p className="text-sm text-default-600 leading-relaxed">{summary}</p>
      {clauses.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-default-500 uppercase">Key Clauses</p>
          {clauses.map((clause, i) => (
            <div
              key={i}
              className={cn('clay-card p-3 flex flex-col gap-1', RISK_STYLE[clause.risk])}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{clause.label}</p>
                <Chip size="sm" color={RISK_COLOR[clause.risk]}>
                  {clause.risk}
                </Chip>
              </div>
              <p className="text-xs text-default-600">{clause.plain}</p>
              {clause.detail && <p className="text-xs text-default-400 italic">{clause.detail}</p>}
            </div>
          ))}
        </div>
      )}
      {what_ifs.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-default-500 uppercase">What If...</p>
          <div className="flex flex-wrap gap-2">
            {what_ifs.map((w, i) => (
              <Button
                key={i}
                size="sm"
                variant="outline"
                className="clay-btn text-xs"
                onPress={() => handleWhatIfClick(w)}
              >
                {w.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
