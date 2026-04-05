import { plaidClient } from './client'
import type { Transaction } from 'plaid'
import type { EntryType } from '@/types/database'

export async function fetchTransactions(accessToken: string, startDate: string, endDate: string) {
  const response = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
    options: { count: 500, offset: 0 },
  })
  return response.data.transactions
}

export function normalizeTransaction(t: Transaction): {
  category: string
  amount: number
  entry_type: EntryType
  date: string
  source: 'plaid'
} {
  const isIncome = t.amount < 0 // Plaid uses negative for credits
  return {
    category: t.personal_finance_category?.primary ?? t.category?.[0] ?? 'Other',
    amount: Math.abs(t.amount),
    entry_type: isIncome ? 'income' : 'expense',
    date: t.date,
    source: 'plaid',
  }
}
