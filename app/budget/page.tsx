'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppNav } from '@/components/app-nav'
import { BudgetChart } from './_components/budget-chart'
import { AddEntryForm } from './_components/add-entry-form'
import { CsvImport } from './_components/csv-import'
import type { DbBudgetEntry } from '@/types/database'

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

export default function BudgetPage() {
  const [entries, setEntries] = useState<DbBudgetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/budget?days=90')
      if (!res.ok) {
        setFetchError(`Failed to load entries (${res.status}). Please try again.`)
        return
      }
      const data: DbBudgetEntry[] = await res.json()
      setEntries(data)
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
    setEntries(prev => [entry, ...prev])
  }, [])

  const handleImported = useCallback(() => { load() }, [load])

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
            <AddEntryForm onAdded={handleAdded} />
          </div>

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
