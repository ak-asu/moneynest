'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@heroui/react'
import { BrainCircuit } from 'lucide-react'
import { AppNav } from '@/components/app-nav'
import { BudgetChart } from './_components/budget-chart'
import { AddEntryForm } from './_components/add-entry-form'
import { CsvImport } from './_components/csv-import'
import { ProfileSyncBanner } from './_components/profile-sync-banner'
import type { DbBudgetEntry, DbProfile } from '@/types/database'
import { useI18n } from '@/components/i18n-provider'
import type { Locale } from '@/lib/i18n/config'

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const { formatCurrency } = useI18n()
  const formatted = formatCurrency(Math.abs(value), { maximumFractionDigits: 0 })
  return (
    <dl className="clay-card p-4 flex flex-col gap-1">
      <dt className="text-xs font-semibold text-default-400 uppercase tracking-wide">{label}</dt>
      <dd className={`text-2xl font-bold ${color}`}>{value < 0 ? `-${formatted}` : formatted}</dd>
    </dl>
  )
}

function formatDate(iso: string, intlLocale: string) {
  return new Intl.DateTimeFormat(intlLocale, { month: 'short', day: 'numeric' }).format(
    new Date(iso + 'T00:00:00')
  )
}

function normalizeCategory(category: string) {
  return category.trim().toLowerCase()
}

/** Returns per-category expense totals from the last 30 days of entries. */
function computeMonthlyExpenses(entries: DbBudgetEntry[]): Record<string, number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const totals: Record<string, number> = {}
  for (const e of entries) {
    if (e.entry_type !== 'expense' || e.date < since) continue
    const normalized = normalizeCategory(e.category)
    if (!normalized) continue
    totals[normalized] = (totals[normalized] ?? 0) + e.amount
  }
  return totals
}

function normalizeExpenseMap(expenses: Record<string, number>) {
  const normalized: Record<string, number> = {}
  for (const [key, value] of Object.entries(expenses)) {
    const category = normalizeCategory(key)
    if (!category) continue
    normalized[category] = (normalized[category] ?? 0) + value
  }
  return normalized
}

/**
 * Returns true if the budget-derived expenses differ meaningfully from the
 * profile's stored expenses. "Meaningful" = a category is new with >$50/mo,
 * or an existing category differs by more than 10%.
 */
function hasMeaningfulDiff(
  budgetExpenses: Record<string, number>,
  profileExpenses: Record<string, number>
): boolean {
  const allCats = new Set([...Object.keys(budgetExpenses), ...Object.keys(profileExpenses)])
  for (const cat of allCats) {
    const budget = budgetExpenses[cat] ?? 0
    const profile = profileExpenses[cat] ?? 0
    if (profile === 0 && budget > 50) return true
    if (profile > 0 && budget > profile && (budget - profile) / profile > 0.1) return true
  }
  return false
}

/** Builds the pre-filled Vela chat message from the current entries. */
function buildVelaSeed(
  entries: DbBudgetEntry[],
  locale: Locale,
  formatNumber: (value: number) => string
): string {
  const totalIncome = entries
    .filter((e) => e.entry_type === 'income')
    .reduce((s, e) => s + e.amount, 0)
  const totalExpenses = entries
    .filter((e) => e.entry_type === 'expense')
    .reduce((s, e) => s + e.amount, 0)
  const surplus = totalIncome - totalExpenses

  const catTotals: Record<string, number> = {}
  for (const e of entries.filter((e) => e.entry_type === 'expense')) {
    catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount
  }
  const top5 = Object.entries(catTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, amt]) => `${cat}: $${formatNumber(Math.round(amt))}`)
    .join(', ')

  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const d60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const recentTotal = entries
    .filter((e) => e.entry_type === 'expense' && e.date >= d30)
    .reduce((s, e) => s + e.amount, 0)
  const prevTotal = entries
    .filter((e) => e.entry_type === 'expense' && e.date >= d60 && e.date < d30)
    .reduce((s, e) => s + e.amount, 0)
  const trend =
    prevTotal > 0 ? (recentTotal > prevTotal ? 'trending up' : 'trending down') : 'no prior data'

  if (locale === 'es') {
    return (
      `Este es mi resumen de presupuesto de los últimos 90 días: ` +
      `Ingresos $${formatNumber(totalIncome)}, ` +
      `Gastos $${formatNumber(totalExpenses)}, ` +
      `${surplus >= 0 ? 'Superávit' : 'Déficit'} $${formatNumber(Math.abs(surplus))}. ` +
      `Categorías con más gasto: ${top5 || 'ninguna'}. ` +
      `Tendencia de gasto vs los 30 días previos: ${trend}. ` +
      `¿Puedes analizarlo y sugerirme cómo mejorar?`
    )
  }

  return (
    `Here's my budget breakdown for the last 90 days: ` +
    `Income $${formatNumber(totalIncome)}, ` +
    `Expenses $${formatNumber(totalExpenses)}, ` +
    `${surplus >= 0 ? 'Surplus' : 'Deficit'} $${formatNumber(Math.abs(surplus))}. ` +
    `Top spending categories: ${top5 || 'none'}. ` +
    `Spending trend vs prior 30 days: ${trend}. ` +
    `Can you help me analyze this and suggest ways to improve?`
  )
}

export default function BudgetPage() {
  const { t, formatNumber, locale, intlLocale } = useI18n()
  const router = useRouter()
  const [entries, setEntries] = useState<DbBudgetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [syncBanner, setSyncBanner] = useState<Record<string, number> | null>(null)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const [entriesRes, profileRes] = await Promise.all([
        fetch('/api/budget?days=90'),
        fetch('/api/profile'),
      ])
      if (!entriesRes.ok) {
        setFetchError(t('budget.fetchFailed', { status: entriesRes.status }))
        return
      }
      const data: DbBudgetEntry[] = await entriesRes.json()
      const prof: DbProfile | null = profileRes.ok ? await profileRes.json() : null
      setEntries(data)
      setProfile(prof)

      if (prof) {
        const budgetExpenses = computeMonthlyExpenses(data)
        const profileExpenses = normalizeExpenseMap(prof.expenses as Record<string, number>)
        if (hasMeaningfulDiff(budgetExpenses, profileExpenses)) {
          setSyncBanner(budgetExpenses)
        }
      }
    } catch {
      setFetchError(t('budget.networkFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflowY = html.style.overflowY
    const prevBodyOverflowY = body.style.overflowY

    html.style.overflowY = 'hidden'
    body.style.overflowY = 'hidden'

    return () => {
      html.style.overflowY = prevHtmlOverflowY
      body.style.overflowY = prevBodyOverflowY
    }
  }, [])

  const totalIncome = entries
    .filter((e) => e.entry_type === 'income')
    .reduce((s, e) => s + e.amount, 0)
  const totalExpenses = entries
    .filter((e) => e.entry_type === 'expense')
    .reduce((s, e) => s + e.amount, 0)
  const surplus = totalIncome - totalExpenses

  const handleAdded = useCallback(
    (entry: DbBudgetEntry) => {
      setEntries((prev) => {
        const next = [entry, ...prev]
        if (profile) {
          const budgetExpenses = computeMonthlyExpenses(next)
          const profileExpenses = normalizeExpenseMap(profile.expenses as Record<string, number>)
          if (hasMeaningfulDiff(budgetExpenses, profileExpenses)) {
            setSyncBanner(budgetExpenses)
          } else {
            setSyncBanner(null)
          }
        }
        return next
      })

      if (entry.entry_type !== 'expense' || !profile) return

      const profileExpenses = normalizeExpenseMap(
        (profile.expenses as Record<string, number>) ?? {}
      )
      const normalizedCategory = normalizeCategory(entry.category)
      if (!normalizedCategory) return
      const mergedExpenses = {
        ...profileExpenses,
        [normalizedCategory]: (profileExpenses[normalizedCategory] ?? 0) + entry.amount,
      }
      const nextProfile = { ...profile, expenses: mergedExpenses }
      setProfile(nextProfile)

      void fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: profile.persona,
          language: profile.language,
          income_monthly: profile.income_monthly,
          income_type: profile.income_type,
          debts: profile.debts,
          goals: profile.goals,
          savings_balance: profile.savings_balance,
          expenses: mergedExpenses,
        }),
      })
    },
    [profile]
  )

  const handleImported = useCallback(
    (_count: number) => {
      load()
    },
    [load]
  )

  const handleConfirmSync = useCallback(async () => {
    if (!syncBanner || !profile) return
    setSyncing(true)
    try {
      await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          income_monthly: profile.income_monthly,
          income_type: profile.income_type,
          debts: profile.debts,
          goals: profile.goals,
          savings_balance: profile.savings_balance,
          expenses: syncBanner,
        }),
      })
      setProfile((prev) => (prev ? { ...prev, expenses: syncBanner } : prev))
      setSyncBanner(null)
    } finally {
      setSyncing(false)
    }
  }, [syncBanner, profile])

  const handleAnalyzeWithVela = useCallback(() => {
    sessionStorage.setItem('vela_chat_seed', buildVelaSeed(entries, locale, formatNumber))
    router.push('/chat')
  }, [entries, formatNumber, locale, router])

  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden">
      <AppNav />
      <main aria-label="Budget and tracking" className="flex-1 min-h-0 min-w-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{t('budget.title')}</h1>
              <p className="text-default-500 text-sm mt-1">{t('budget.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onPress={handleAnalyzeWithVela}
                isDisabled={entries.length === 0}
                className="clay-btn gap-1"
              >
                <BrainCircuit size={14} />
                {t('budget.analyze')}
              </Button>
              <AddEntryForm onAdded={handleAdded} />
            </div>
          </div>

          {/* Profile sync banner */}
          {syncBanner && (
            <ProfileSyncBanner
              suggestedExpenses={syncBanner}
              confirming={syncing}
              onConfirm={handleConfirmSync}
              onDismiss={() => setSyncBanner(null)}
            />
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label={t('budget.summary.income')}
              value={totalIncome}
              color="text-success-600"
            />
            <SummaryCard
              label={t('budget.summary.expenses')}
              value={totalExpenses}
              color="text-danger-600"
            />
            <SummaryCard
              label={surplus >= 0 ? t('budget.summary.surplus') : t('budget.summary.deficit')}
              value={surplus}
              color={surplus >= 0 ? 'text-primary-600' : 'text-warning-600'}
            />
          </div>

          {/* Charts */}
          <BudgetChart entries={entries} />

          {/* CSV Import */}
          <div className="clay-card p-5 space-y-3">
            <h2 className="font-bold text-sm">{t('budget.importTitle')}</h2>
            <CsvImport onImported={handleImported} />
          </div>

          {/* Entries list */}
          <div className="clay-card p-5 space-y-3">
            <h2 className="font-bold text-sm">{t('budget.entriesTitle')}</h2>
            {loading ? (
              <p className="text-default-400 text-sm">{t('common.loading')}</p>
            ) : fetchError ? (
              <p className="text-danger text-sm">{fetchError}</p>
            ) : entries.length === 0 ? (
              <p className="text-default-400 text-sm">{t('budget.noEntries')}</p>
            ) : (
              <div className="space-y-1">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 border-b border-divider last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`shrink-0 w-2 h-2 rounded-full ${entry.entry_type === 'income' ? 'bg-success' : 'bg-danger'}`}
                        aria-hidden="true"
                      />
                      <span className="text-sm text-default-700 truncate">{entry.category}</span>
                      <span className="text-xs text-default-400 shrink-0">
                        {formatDate(entry.date, intlLocale)}
                      </span>
                      {entry.source === 'csv' && (
                        <span className="shrink-0 text-xs bg-default-100 text-default-500 px-1.5 py-0.5 rounded-md">
                          CSV
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ml-4 ${entry.entry_type === 'income' ? 'text-success-600' : 'text-danger-600'}`}
                    >
                      {entry.entry_type === 'income' ? '+' : '-'}${formatNumber(entry.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
