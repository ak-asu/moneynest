// app/budget/_components/budget-chart.tsx
'use client'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { DbBudgetEntry } from '@/types/database'

interface BudgetChartProps {
  entries: DbBudgetEntry[]
}

export function BudgetChart({ entries }: BudgetChartProps) {
  // Group by month for the trend chart (last 6 months)
  const byMonth: Record<string, { income: number; expense: number }> = {}
  for (const e of entries) {
    const month = e.date.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = { income: 0, expense: 0 }
    byMonth[month][e.entry_type] += e.amount
  }
  const monthData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, totals]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      income: Math.round(totals.income),
      expense: Math.round(totals.expense),
    }))

  // Top expense categories
  const byCat: Record<string, number> = {}
  for (const e of entries) {
    if (e.entry_type === 'expense') {
      byCat[e.category] = (byCat[e.category] ?? 0) + e.amount
    }
  }
  const categoryData = Object.entries(byCat)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, amount]) => ({ name, amount: Math.round(amount) }))

  if (entries.length === 0) {
    return (
      <div className="clay-card p-8 text-center text-default-400 text-sm">
        No data yet. Add entries or import a CSV to see charts.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {monthData.length > 0 && (
        <div className="clay-card p-5">
          <h3 className="text-sm font-semibold text-default-600 mb-4">Monthly Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => typeof v === 'number' ? `$${v.toLocaleString()}` : String(v)} />
              <Legend />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {categoryData.length > 0 && (
        <div className="clay-card p-5">
          <h3 className="text-sm font-semibold text-default-600 mb-4">Top Expense Categories</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v: unknown) => typeof v === 'number' ? `$${v.toLocaleString()}` : String(v)} />
              <Bar dataKey="amount" name="Total spent" fill="#818cf8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
