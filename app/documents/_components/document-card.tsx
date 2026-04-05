'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Chip } from '@heroui/react'
import {
  FileText, ChevronDown, ChevronUp, Volume2,
  Shield, Home, Receipt, Banknote,
  AlertTriangle, Info, CheckCircle, BarChart2, MessageSquare,
} from 'lucide-react'
import { useTTS } from '@/components/audio/use-tts'
import { DocumentVisual } from '@/components/documents/document-visual'
import type { DbDocument, DbProfile, DocumentKind } from '@/types/database'

const RISK_COLOR = { low: 'success', medium: 'warning', high: 'danger' } as const

type TypeConfig = {
  icon: React.ElementType
  accentClass: string
  badgeClass: string
  label: string
}

const TYPE_CONFIG: Record<DocumentKind, TypeConfig> = {
  insurance: {
    icon: Shield,
    accentClass: 'border-l-blue-500/60',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    label: 'Insurance',
  },
  lease: {
    icon: Home,
    accentClass: 'border-l-amber-500/60',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    label: 'Lease',
  },
  bill: {
    icon: Receipt,
    accentClass: 'border-l-rose-500/60',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    label: 'Bill',
  },
  payslip: {
    icon: Banknote,
    accentClass: 'border-l-emerald-500/60',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    label: 'Pay Stub',
  },
  other: {
    icon: FileText,
    accentClass: 'border-l-slate-500/60',
    badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    label: 'Document',
  },
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

function buildChatSeed(doc: DbDocument): string {
  const config = TYPE_CONFIG[doc.document_type] ?? TYPE_CONFIG.other
  const explanation = doc.ai_explanation
  const lines: string[] = [
    `I'd like to go over my ${config.label.toLowerCase()} document "${doc.filename}".`,
  ]
  if (explanation?.plain_summaries?.[0]) {
    lines.push(`\nSummary: ${explanation.plain_summaries[0]}`)
  }
  if (explanation?.risk_flags?.length) {
    lines.push(`\nKey concerns: ${explanation.risk_flags.join('; ')}`)
  }
  if (explanation?.what_ifs?.length) {
    lines.push(`\nI'd like to explore: ${explanation.what_ifs[0].label}`)
  }
  lines.push('\nCan you walk me through what I should know and what to do next?')
  return lines.join('')
}

interface DocumentCardProps {
  doc: DbDocument
  profile: DbProfile | null
}

export function DocumentCard({ doc, profile }: DocumentCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [showVisual, setShowVisual] = useState(false)
  const { speak, isPlaying } = useTTS()
  const explanation = doc.ai_explanation
  const config = TYPE_CONFIG[doc.document_type] ?? TYPE_CONFIG.other
  const TypeIcon = config.icon

  const highRiskCount = explanation?.clauses.filter(c => c.risk === 'high').length ?? 0
  const medRiskCount = explanation?.clauses.filter(c => c.risk === 'medium').length ?? 0
  const allLow = explanation != null && highRiskCount === 0 && medRiskCount === 0

  function discussInChat() {
    sessionStorage.setItem('vela_chat_seed', buildChatSeed(doc))
    router.push('/chat')
  }

  return (
    <div className={`clay-card border-l-4 ${config.accentClass} overflow-hidden`}>
      <div className="p-5 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`mt-0.5 p-1.5 rounded-lg border ${config.badgeClass} shrink-0`}>
              <TypeIcon size={14} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate" title={doc.filename}>
                {doc.filename}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${config.badgeClass}`}>
                  {config.label}
                </span>
                <span className="text-xs text-default-400">{formatDate(doc.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {explanation && (
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                onPress={() => speak(explanation.plain_summaries.join('. '))}
                isDisabled={isPlaying}
                className="text-default-400 hover:text-default-600"
                aria-label="Listen to summary"
              >
                <Volume2 size={14} />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              onPress={() => setShowVisual(v => !v)}
              className={`transition-colors ${showVisual ? 'text-primary' : 'text-default-400 hover:text-default-600'}`}
              aria-label="Toggle visuals"
            >
              <BarChart2 size={14} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              onPress={() => setExpanded(e => !e)}
              className="text-default-400 hover:text-default-600"
              aria-label={expanded ? 'Collapse details' : 'Show details'}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>
        </div>

        {/* Summary */}
        {explanation && (
          <p className="text-sm text-default-500 leading-relaxed">
            {explanation.plain_summaries[0]}
          </p>
        )}

        {/* Risk indicators */}
        {explanation && (highRiskCount > 0 || medRiskCount > 0 || allLow) && (
          <div className="flex flex-wrap gap-2">
            {highRiskCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-danger-500 bg-danger-50 dark:bg-danger-900/20 px-2.5 py-1 rounded-full border border-danger-100 dark:border-danger-800/30">
                <AlertTriangle size={11} />
                {highRiskCount} high risk
              </div>
            )}
            {medRiskCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-warning-600 bg-warning-50 dark:bg-warning-900/20 px-2.5 py-1 rounded-full border border-warning-100 dark:border-warning-800/30">
                <Info size={11} />
                {medRiskCount} medium risk
              </div>
            )}
            {allLow && (
              <div className="flex items-center gap-1.5 text-xs text-success-600 bg-success-50 dark:bg-success-900/20 px-2.5 py-1 rounded-full border border-success-100 dark:border-success-800/30">
                <CheckCircle size={11} />
                All clear
              </div>
            )}
          </div>
        )}

        {/* Visual Panel */}
        {showVisual && (
          <DocumentVisual doc={doc} profile={profile} />
        )}

        {/* Expanded clause details */}
        {expanded && explanation && (
          <div className="flex flex-col gap-2 pt-2 border-t border-default-200 dark:border-white/10">
            {explanation.clauses.map((clause, i) => (
              <div key={i} className="bg-default-50 dark:bg-white/5 rounded-2xl p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{clause.label}</span>
                  <Chip size="sm" color={RISK_COLOR[clause.risk]} variant="soft">{clause.risk} risk</Chip>
                </div>
                <p className="text-xs text-default-600">{clause.plain}</p>
                {clause.detail && (
                  <p className="text-xs text-default-400 italic mt-0.5">{clause.detail}</p>
                )}
              </div>
            ))}

            {explanation.risk_flags.length > 0 && (
              <div className="rounded-2xl p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-100 dark:border-danger-800/30">
                <p className="text-xs font-semibold text-danger-700 dark:text-danger-400 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle size={11} />
                  Watch out for
                </p>
                <div className="flex flex-col gap-1">
                  {explanation.risk_flags.map((f, i) => (
                    <p key={i} className="text-xs text-default-600">• {f}</p>
                  ))}
                </div>
              </div>
            )}

            {explanation.what_ifs.length > 0 && (
              <div className="rounded-2xl p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/30">
                <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 mb-2">What-if scenarios</p>
                <div className="flex flex-wrap gap-2">
                  {explanation.what_ifs.map((w, i) => (
                    <span key={i} className="text-xs bg-white dark:bg-white/10 border border-primary-100 dark:border-primary-800/30 text-primary-600 dark:text-primary-300 rounded-xl px-2.5 py-1">
                      {w.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Discuss in Chat */}
        <div className="pt-1">
          <button
            onClick={discussInChat}
            className="flex items-center gap-1.5 text-xs text-default-400 hover:text-primary transition-colors"
          >
            <MessageSquare size={12} />
            Discuss in Chat
          </button>
        </div>
      </div>
    </div>
  )
}
