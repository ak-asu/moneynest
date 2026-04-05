'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertTriangle, CheckCircle, TrendingUp, Loader2 } from 'lucide-react'
import type { DbDocument, DbProfile, DocumentExplanation } from '@/types/database'

// ─── Risk Distribution Chart ────────────────────────────────────────────────

function RiskChart({ explanation }: { explanation: DocumentExplanation }) {
  const counts = { low: 0, medium: 0, high: 0 }
  for (const c of explanation.clauses) counts[c.risk]++

  const data = [
    { name: 'Low', value: counts.low, fill: '#10b981' },
    { name: 'Medium', value: counts.medium, fill: '#f59e0b' },
    { name: 'High', value: counts.high, fill: '#ef4444' },
  ].filter((d) => d.value > 0)

  if (data.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-2">
        Clause Risk Breakdown
      </p>
      <ResponsiveContainer width="100%" height={data.length * 34 + 8}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={52}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) =>
              typeof v === 'number' ? [`${v} clause${v !== 1 ? 's' : ''}`, ''] : [v, '']
            }
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Bar
            dataKey="value"
            radius={4}
            barSize={18}
            label={{ position: 'right', fontSize: 11, fill: 'currentColor' }}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-3 mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-default-500">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
            {d.value} {d.name}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Payslip Chart ───────────────────────────────────────────────────────────

function PayslipChart({ income_monthly }: { income_monthly: number }) {
  const tax = Math.round(income_monthly * 0.22)
  const fica = Math.round(income_monthly * 0.0765)
  const net = income_monthly - tax - fica

  const data = [
    { name: 'Gross', value: income_monthly, fill: '#6c5ce7' },
    { name: 'Tax', value: tax, fill: '#fd79a8' },
    { name: 'FICA', value: fica, fill: '#e17055' },
    { name: 'Net', value: net, fill: '#00b894' },
  ]

  return (
    <div>
      <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-2">
        Income vs Profile
      </p>
      <ResponsiveContainer width="100%" height={data.length * 34 + 8}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 56, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={40}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => (typeof v === 'number' ? [`$${v.toLocaleString()}`, ''] : [v, ''])}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Bar
            dataKey="value"
            radius={4}
            barSize={18}
            label={{
              position: 'right',
              fontSize: 11,
              fill: 'currentColor',
              formatter: (v: any) => (typeof v === 'number' ? `$${v.toLocaleString()}` : ''),
            }}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-default-500">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
            {d.name}: ${d.value.toLocaleString()}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Profile Correlation Callout ─────────────────────────────────────────────

function ProfileCorrelation({ doc, profile }: { doc: DbDocument; profile: DbProfile }) {
  const explanation = doc.ai_explanation
  if (!explanation || !profile) return null

  const savings = profile.savings_balance
  const income = profile.income_monthly
  const totalExpenses = Object.values(profile.expenses).reduce((a, b) => a + b, 0)
  const surplus = income - totalExpenses

  type Callout = { icon: React.ReactNode; text: string; variant: 'ok' | 'warn' | 'info' }
  const callouts: Callout[] = []

  if (doc.document_type === 'insurance') {
    // Try to detect deductible from clause labels
    const deductibleClause = explanation.clauses.find(
      (c) =>
        c.label.toLowerCase().includes('deductible') || c.plain.toLowerCase().includes('deductible')
    )
    if (deductibleClause) {
      const match = deductibleClause.plain.match(/\$[\d,]+/)
      const deductible = match ? parseInt(match[0].replace(/[$,]/g, ''), 10) : null
      if (deductible && savings < deductible) {
        callouts.push({
          icon: <AlertTriangle size={12} />,
          text: `Your savings ($${savings.toLocaleString()}) don't cover a $${deductible.toLocaleString()} deductible — you'd need $${(deductible - savings).toLocaleString()} more.`,
          variant: 'warn',
        })
      } else if (deductible && savings >= deductible) {
        callouts.push({
          icon: <CheckCircle size={12} />,
          text: `Your savings ($${savings.toLocaleString()}) cover the deductible — you're prepared.`,
          variant: 'ok',
        })
      }
    }
    if (!deductibleClause) {
      callouts.push({
        icon: <CheckCircle size={12} />,
        text: `You have $${savings.toLocaleString()} in savings to cover potential insurance gaps.`,
        variant: 'info',
      })
    }
  }

  if (doc.document_type === 'payslip') {
    const docIncome = income // Use profile income for now — matches extracted numbers on upload
    const diff = docIncome - income
    if (Math.abs(diff) < 50) {
      callouts.push({
        icon: <CheckCircle size={12} />,
        text: `Your payslip aligns with your profile income of $${income.toLocaleString()}/mo.`,
        variant: 'ok',
      })
    } else if (diff > 0) {
      callouts.push({
        icon: <TrendingUp size={12} />,
        text: `Payslip income is $${diff.toLocaleString()} higher than your profile — update your profile for accurate insights.`,
        variant: 'info',
      })
    }
  }

  if (doc.document_type === 'lease') {
    const rentExpense = profile.expenses['rent'] ?? profile.expenses['housing'] ?? 0
    if (rentExpense > 0) {
      const rentRatio = rentExpense / income
      const variant: Callout['variant'] = rentRatio > 0.35 ? 'warn' : 'ok'
      callouts.push({
        icon: rentRatio > 0.35 ? <AlertTriangle size={12} /> : <CheckCircle size={12} />,
        text:
          rentRatio > 0.35
            ? `Rent ($${rentExpense.toLocaleString()}/mo) is ${Math.round(rentRatio * 100)}% of income — above the 30% guideline.`
            : `Rent ($${rentExpense.toLocaleString()}/mo) is ${Math.round(rentRatio * 100)}% of income — within healthy range.`,
        variant,
      })
    }
  }

  if (doc.document_type === 'bill') {
    if (surplus > 0) {
      callouts.push({
        icon: <TrendingUp size={12} />,
        text: `You have $${surplus.toLocaleString()}/mo surplus after expenses — bills should be manageable.`,
        variant: 'ok',
      })
    } else {
      callouts.push({
        icon: <AlertTriangle size={12} />,
        text: `You're running a $${Math.abs(surplus).toLocaleString()}/mo deficit — this bill adds pressure.`,
        variant: 'warn',
      })
    }
  }

  if (callouts.length === 0) return null

  const styles: Record<Callout['variant'], string> = {
    ok: 'bg-success-50 dark:bg-success-900/20 border-success-100 dark:border-success-800/30 text-success-700 dark:text-success-400',
    warn: 'bg-warning-50 dark:bg-warning-900/20 border-warning-100 dark:border-warning-800/30 text-warning-700 dark:text-warning-400',
    info: 'bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800/30 text-primary-700 dark:text-primary-400',
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-default-500 uppercase tracking-wide">
        Your Situation
      </p>
      {callouts.map((c, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 rounded-xl px-3 py-2 border text-xs ${styles[c.variant]}`}
        >
          <span className="mt-0.5 shrink-0">{c.icon}</span>
          <span>{c.text}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DocumentVisualProps {
  doc: DbDocument
  profile: DbProfile | null
}

export function DocumentVisual({ doc, profile }: DocumentVisualProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgLoading, setImgLoading] = useState(true)

  const explanation = doc.ai_explanation

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImgLoading(true)
    fetch(`/api/documents/${doc.id}/visual`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.url) setImgSrc(d.url)
      })
      .catch(() => {})
      .finally(() => setImgLoading(false))
  }, [doc.id])

  return (
    <div className="flex flex-col gap-4 pt-3 border-t border-default-200 dark:border-white/10">
      {/* Gemini Illustration */}
      <div>
        <p className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-2">
          Visual Overview
        </p>
        <div
          className="relative w-full rounded-2xl overflow-hidden bg-default-100 dark:bg-white/5 flex items-center justify-center"
          style={{ aspectRatio: '16/9' }}
        >
          {imgLoading && <Loader2 size={20} className="text-default-300 animate-spin" />}
          {!imgLoading && !imgSrc && <p className="text-xs text-default-400">Visual unavailable</p>}
          {imgSrc && (
            <Image
              src={imgSrc}
              alt={`Visual overview of ${doc.filename}`}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-contain"
            />
          )}
        </div>
      </div>

      {/* Risk chart */}
      {explanation && explanation.clauses.length > 0 && <RiskChart explanation={explanation} />}

      {/* Payslip chart when income is in profile */}
      {doc.document_type === 'payslip' && profile && profile.income_monthly > 0 && (
        <PayslipChart income_monthly={profile.income_monthly} />
      )}

      {/* Profile correlation */}
      {profile && <ProfileCorrelation doc={doc} profile={profile} />}
    </div>
  )
}
