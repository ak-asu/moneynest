'use client'
import { useRouter } from 'next/navigation'
import { FileText, Shield, Home, Receipt, Banknote, ArrowRight } from 'lucide-react'
import type { ViewDocumentProps } from '@/types/components'

const TYPE_CONFIG = {
  insurance: {
    icon: Shield,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Insurance',
  },
  lease: {
    icon: Home,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Lease',
  },
  bill: {
    icon: Receipt,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'Bill',
  },
  payslip: {
    icon: Banknote,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'Pay Stub',
  },
  other: {
    icon: FileText,
    color: 'text-default-600',
    bg: 'bg-default-100',
    border: 'border-default-200',
    label: 'Document',
  },
  general: {
    icon: FileText,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    label: 'Document Vault',
  },
}

export function ViewDocument({ filename, document_type = 'general', message }: ViewDocumentProps) {
  const router = useRouter()
  const config = TYPE_CONFIG[document_type] ?? TYPE_CONFIG.general
  const DocIcon = config.icon

  return (
    <div className="clay-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg border ${config.bg} ${config.border} ${config.color}`}>
          <DocIcon size={14} />
        </div>
        <div>
          <p className="text-xs font-semibold text-default-500 uppercase tracking-wide">
            {config.label}
          </p>
          {filename && <p className="text-sm font-medium truncate">{filename}</p>}
        </div>
      </div>

      {message && <p className="text-sm text-default-600 leading-relaxed">{message}</p>}

      <button
        onClick={() => router.push('/documents')}
        className="clay-btn flex items-center justify-between w-full rounded-2xl border border-primary/20 bg-primary/10 hover:bg-primary/15 px-4 py-2.5 transition-colors group"
      >
        <span className="text-sm font-medium text-primary">
          {filename ? `View "${filename}"` : 'Open Document Vault'}
        </span>
        <ArrowRight
          size={14}
          className="text-primary group-hover:translate-x-0.5 transition-transform"
        />
      </button>
    </div>
  )
}
