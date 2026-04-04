'use client'
import { useState } from 'react'
import { Button, Chip } from '@heroui/react'
import { FileText, ChevronDown, ChevronUp, Volume2 } from 'lucide-react'
import { useTTS } from '@/components/audio/use-tts'
import type { DbDocument } from '@/types/database'

const RISK_COLOR = { low: 'success', medium: 'warning', high: 'danger' } as const

export function DocumentCard({ doc }: { doc: DbDocument }) {
  const [expanded, setExpanded] = useState(false)
  const { speak, isPlaying } = useTTS()
  const explanation = doc.ai_explanation

  return (
    <div className="clay-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-primary shrink-0" />
          <div>
            <p className="font-semibold text-sm">{doc.filename}</p>
            <p className="text-xs text-default-400 capitalize">{doc.document_type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            onPress={() => explanation && speak(explanation.plain_summaries.join('. '))}
            isDisabled={isPlaying}
          >
            <Volume2 size={14} />
          </Button>
          <Button size="sm" variant="ghost" isIconOnly onPress={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </div>
      </div>

      {explanation && (
        <div className="text-sm text-default-600">
          {explanation.plain_summaries[0]}
        </div>
      )}

      {expanded && explanation && (
        <div className="flex flex-col gap-2 mt-1">
          {explanation.clauses.map((clause, i) => (
            <div key={i} className="bg-default-50 rounded-2xl p-3 flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{clause.label}</span>
                <Chip size="sm" color={RISK_COLOR[clause.risk]} variant="soft">{clause.risk} risk</Chip>
              </div>
              <p className="text-xs text-default-600">{clause.plain}</p>
            </div>
          ))}
          {explanation.risk_flags.length > 0 && (
            <div className="rounded-2xl p-3 bg-danger-50">
              <p className="text-xs font-semibold text-danger-700 mb-1">⚠️ Watch out for</p>
              {explanation.risk_flags.map((f, i) => <p key={i} className="text-xs text-default-600">• {f}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
