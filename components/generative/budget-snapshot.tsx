'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { BudgetSnapshotProps } from '@/types/components'

const COLORS = ['#6c5ce7', '#fd79a8', '#00b894', '#fdcb6e', '#e17055', '#74b9ff', '#a29bfe']

export function BudgetSnapshot({
  income_monthly,
  expenses,
  savings_rate,
  anomalies,
  coverage_gaps,
}: BudgetSnapshotProps) {
  const data = Object.entries(expenses).map(([name, value]) => ({ name, value }))
  const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0)

  return (
    <div className="clay-card p-5 flex flex-col gap-4">
      <h3 className="font-bold text-base">Your Budget Snapshot</h3>
      <div className="flex gap-4 text-sm">
        <div className="flex-1 clay-card p-3">
          <p className="text-default-500 text-xs">Income</p>
          <p className="font-bold text-success">${income_monthly.toLocaleString()}</p>
        </div>
        <div className="flex-1 clay-card p-3">
          <p className="text-default-500 text-xs">Expenses</p>
          <p className="font-bold text-danger">${totalExpenses.toLocaleString()}</p>
        </div>
        <div className="flex-1 clay-card p-3">
          <p className="text-default-500 text-xs">Savings rate</p>
          <p className="font-bold text-primary">{Math.round(savings_rate * 100)}%</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={70}
            dataKey="value"
            label={({ name }) => name}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => `$${v}`} />
        </PieChart>
      </ResponsiveContainer>
      {anomalies.length > 0 && (
        <div className="clay-card-warning rounded-2xl p-3">
          <p className="text-xs font-semibold text-warning-700 mb-1">Anomalies</p>
          {anomalies.map((a, i) => (
            <p key={i} className="text-xs text-default-600">
              • {a}
            </p>
          ))}
        </div>
      )}
      {coverage_gaps.length > 0 && (
        <div className="clay-card-danger rounded-2xl p-3">
          <p className="text-xs font-semibold text-danger-700 mb-1">Coverage gaps</p>
          {coverage_gaps.map((g, i) => (
            <p key={i} className="text-xs text-default-600">
              • {g}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
