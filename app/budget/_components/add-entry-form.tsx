// app/budget/_components/add-entry-form.tsx
'use client'
import { useState } from 'react'
import { Button } from '@heroui/react'
import { Plus } from 'lucide-react'
import type { DbBudgetEntry, EntryType } from '@/types/database'

interface AddEntryFormProps {
  onAdded: (entry: DbBudgetEntry) => void
}

export function AddEntryForm({ onAdded }: AddEntryFormProps) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [entryType, setEntryType] = useState<EntryType>('expense')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!category.trim() || !amount || !date) {
      setError('All fields are required.')
      return
    }
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) {
      setError('Amount must be a positive number.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category.trim(),
          amount: parsed,
          entry_type: entryType,
          date,
        }),
      })
      if (!res.ok) {
        setError('Failed to save. Please try again.')
        return
      }
      const entry: DbBudgetEntry = await res.json()
      onAdded(entry)
      setCategory('')
      setAmount('')
      setDate(new Date().toISOString().split('T')[0])
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="primary" onPress={() => setOpen(true)} className="clay-btn gap-1">
        <Plus size={14} />
        Add Entry
      </Button>
    )
  }

  return (
    <form onSubmit={submit} className="clay-card p-5 space-y-4">
      <h3 className="font-bold text-sm">New Entry</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="entry-category"
            className="text-xs font-medium text-default-600 mb-1 block"
          >
            Category
          </label>
          <input
            id="entry-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Rent"
            className="clay-input w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm outline-none focus:border-primary-400"
          />
        </div>
        <div>
          <label htmlFor="entry-amount" className="text-xs font-medium text-default-600 mb-1 block">
            Amount ($)
          </label>
          <input
            id="entry-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="clay-input w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm outline-none focus:border-primary-400"
          />
        </div>
        <div>
          <div
            role="group"
            aria-label="Entry type"
            className="text-xs font-medium text-default-600 mb-1 block"
          >
            Type
          </div>
          <div className="flex gap-1">
            {(['income', 'expense'] as EntryType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEntryType(t)}
                aria-pressed={entryType === t}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                  entryType === t
                    ? t === 'income'
                      ? 'bg-success-100 border-success text-success-700'
                      : 'bg-danger-100 border-danger text-danger-700'
                    : 'border-default-200 text-default-500 hover:border-default-300'
                }`}
              >
                {t === 'income' ? 'Income' : 'Expense'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="entry-date" className="text-xs font-medium text-default-600 mb-1 block">
            Date
          </label>
          <input
            id="entry-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="clay-input w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm outline-none focus:border-primary-400"
          />
        </div>
      </div>
      {error && <p className="text-danger text-xs">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" isDisabled={saving} className="clay-btn">
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onPress={() => setOpen(false)}
          className="clay-btn"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
