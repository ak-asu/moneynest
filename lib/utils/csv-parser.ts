import Papa from 'papaparse'
import type { EntryType } from '@/types/database'

export interface ParsedBudgetEntry {
  category: string
  amount: number
  entry_type: EntryType
  date: string
  source: 'csv'
}

type Format = 'ynab' | 'mint' | 'generic'

function detectFormat(headers: string[]): Format {
  const h = headers.map(s => s.toLowerCase().trim())
  if (h.includes('outflow') && h.includes('inflow')) return 'ynab'
  if (h.includes('transaction type') && h.includes('category') && h.includes('amount')) return 'mint'
  return 'generic'
}

function parseDate(raw: string): string {
  const trimmed = raw.trim()
  // MM/DD/YYYY → YYYY-MM-DD
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const [, m, d, y] = slash
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  // Fallback: today
  return new Date().toISOString().split('T')[0]
}

function parseMoney(raw: string): number {
  return Math.abs(parseFloat(raw.replace(/[$,\s]/g, '')) || 0)
}

export function parseCSV(csvText: string): ParsedBudgetEntry[] {
  const result = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  })

  if (!result.data.length) return []

  const headers = Object.keys(result.data[0])
  if (headers.length === 0 || headers.every(h => !h.trim())) return []
  const format = detectFormat(headers)
  const entries: ParsedBudgetEntry[] = []

  for (const row of result.data) {
    if (format === 'ynab') {
      // Columns: Date, Payee, Category Group/Category, Category Group, Category, Memo, Outflow, Inflow
      const outflow = parseMoney(row['Outflow'] ?? row['outflow'] ?? '0')
      const inflow = parseMoney(row['Inflow'] ?? row['inflow'] ?? '0')
      const category = (row['Category'] ?? row['category'] ?? row['Payee'] ?? 'Other').trim() || 'Other'
      const date = parseDate(row['Date'] ?? row['date'] ?? '')
      if (outflow > 0) entries.push({ category, amount: outflow, entry_type: 'expense', date, source: 'csv' })
      if (inflow > 0) entries.push({ category, amount: inflow, entry_type: 'income', date, source: 'csv' })
    } else if (format === 'mint') {
      // Columns: Date, Description, Original Description, Amount, Transaction Type, Category, Account Name, Labels, Notes
      const amount = parseMoney(row['Amount'] ?? row['amount'] ?? '0')
      const txType = (row['Transaction Type'] ?? row['transaction type'] ?? '').toLowerCase()
      const entry_type: EntryType = txType === 'credit' ? 'income' : 'expense'
      const category = (row['Category'] ?? row['category'] ?? row['Description'] ?? 'Other').trim() || 'Other'
      const date = parseDate(row['Date'] ?? row['date'] ?? '')
      if (amount > 0) entries.push({ category, amount, entry_type, date, source: 'csv' })
    } else {
      // Generic: Date, Description, Amount (negative = expense, positive = income)
      const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date')) ?? ''
      const amtKey = Object.keys(row).find(k => k.toLowerCase().includes('amount')) ?? ''
      const descKey = Object.keys(row).find(k => k.toLowerCase().includes('desc') || k.toLowerCase().includes('payee') || k.toLowerCase().includes('memo')) ?? ''
      const rawAmount = parseFloat((row[amtKey] ?? '0').replace(/[$,\s]/g, ''))
      if (isNaN(rawAmount) || rawAmount === 0) continue
      const amount = Math.abs(rawAmount)
      const entry_type: EntryType = rawAmount >= 0 ? 'income' : 'expense'
      const category = (row[descKey] ?? 'Other').trim().slice(0, 50) || 'Other'
      const date = parseDate(row[dateKey] ?? '')
      entries.push({ category, amount, entry_type, date, source: 'csv' })
    }
  }

  return entries
}
