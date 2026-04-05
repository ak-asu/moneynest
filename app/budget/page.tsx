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

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const formatted = `$${Math.abs(value).toLocaleString()}`
  return (
    <dl className="clay-card p-4 flex flex-col gap-1">
      <dt className="text-xs font-semibold text-default-400 uppercase tracking-wide">{label}</dt>
      <dd className={`text-2xl font-bold ${color}`}>{value < 0 ? `-${formatted}` : formatted}</dd>
    </dl>
  )
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(iso + 'T00:00:00'),
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
  profileExpenses: Record<string, number>,
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
function buildVelaSeed(entries: DbBudgetEntry[]): string {
  const totalIncome = entries
    .filter(e => e.entry_type === 'income')
    .reduce((s, e) => s + e.amount, 0)
  const totalExpenses = entries
    .filter(e => e.entry_type === 'expense')
    .reduce((s, e) => s + e.amount, 0)
  const surplus = totalIncome - totalExpenses

  const catTotals: Record<string, number> = {}
  for (const e of entries.filter(e => e.entry_type === 'expense')) {
    catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount
  }
  const top5 = Object.entries(catTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, amt]) => `${cat}: $${Math.round(amt).toLocaleString()}`)
    .join(', ')

  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const d60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const recentTotal = entries
    .filter(e => e.entry_type === 'expense' && e.date >= d30)
    .reduce((s, e) => s + e.amount, 0)
  const prevTotal = entries
    .filter(e => e.entry_type === 'expense' && e.date >= d60 && e.date < d30)
    .reduce((s, e) => s + e.amount, 0)
  const trend =
    prevTotal > 0 ? (recentTotal > prevTotal ? 'trending up' : 'trending down') : 'no prior data'

  return (
    `Here's my budget breakdown for the last 90 days: ` +
    `Income $${totalIncome.toLocaleString()}, ` +
    `Expenses $${totalExpenses.toLocaleString()}, ` +
    `${surplus >= 0 ? 'Surplus' : 'Deficit'} $${Math.abs(surplus).toLocaleString()}. ` +
    `Top spending categories: ${top5 || 'none'}. ` +
    `Spending trend vs prior 30 days: ${trend}. ` +
    `Can you help me analyze this and suggest ways to improve?`
  )
}

export default function BudgetPage() {
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
        setFetchError(`Failed to load entries (${entriesRes.status}). Please try again.`)
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
      setFetchError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const totalIncome = entries.filter(e => e.entry_type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpenses = entries.filter(e => e.entry_type === 'expense').reduce((s, e) => s + e.amount, 0)
  const surplus = totalIncome - totalExpenses

  const handleAdded = useCallback((entry: DbBudgetEntry) => {
    setEntries(prev => {
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

    const profileExpenses = normalizeExpenseMap((profile.expenses as Record<string, number>) ?? {})
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
  }, [profile])

  const handleImported = useCallback((_count: number) => { load() }, [load])

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
      setProfile(prev => prev ? { ...prev, expenses: syncBanner } : prev)
      setSyncBanner(null)
    } finally {
      setSyncing(false)
    }
  }, [syncBanner, profile])

  const handleAnalyzeWithVela = useCallback(() => {
    sessionStorage.setItem('vela_chat_seed', buildVelaSeed(entries))
    router.push('/chat')
  }, [entries, router])

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <main aria-label="Budget and tracking" className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-5xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Budget & Tracking</h1>
              <p className="text-default-500 text-sm mt-1">Last 90 days of activity.</p>
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
                Analyze with Vela
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
            <SummaryCard label="Income" value={totalIncome} color="text-success-600" />
            <SummaryCard label="Expenses" value={totalExpenses} color="text-danger-600" />
            <SummaryCard
              label={surplus >= 0 ? 'Surplus' : 'Deficit'}
              value={surplus}
              color={surplus >= 0 ? 'text-primary-600' : 'text-warning-600'}
            />
          </div>

          {/* Charts */}
          <BudgetChart entries={entries} />

          {/* CSV Import */}
          <div className="clay-card p-5 space-y-3">
            <h2 className="font-bold text-sm">Import from Bank / App</h2>
            <CsvImport onImported={handleImported} />
          </div>

          {/* Entries list */}
          <div className="clay-card p-5 space-y-3">
            <h2 className="font-bold text-sm">Recent Entries</h2>
            {loading ? (
              <p className="text-default-400 text-sm">Loading…</p>
            ) : fetchError ? (
              <p className="text-danger text-sm">{fetchError}</p>
            ) : entries.length === 0 ? (
              <p className="text-default-400 text-sm">No entries yet. Add one above or import a CSV.</p>
            ) : (
              <div className="space-y-1">
                {entries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-divider last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`shrink-0 w-2 h-2 rounded-full ${entry.entry_type === 'income' ? 'bg-success' : 'bg-danger'}`}
                        aria-hidden="true"
                      />
                      <span className="text-sm text-default-700 truncate">{entry.category}</span>
                      <span className="text-xs text-default-400 shrink-0">{formatDate(entry.date)}</span>
                      {entry.source === 'csv' && (
                        <span className="shrink-0 text-xs bg-default-100 text-default-500 px-1.5 py-0.5 rounded-md">CSV</span>
                      )}
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ml-4 ${entry.entry_type === 'income' ? 'text-success-600' : 'text-danger-600'}`}>
                      {entry.entry_type === 'income' ? '+' : '-'}${entry.amount.toLocaleString()}
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
