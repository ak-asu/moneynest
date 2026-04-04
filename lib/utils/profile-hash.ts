import { createHash } from 'crypto'
import type { DbProfile } from '@/types/database'

type HashableFields = Pick<DbProfile, 'income_monthly' | 'expenses' | 'debts' | 'goals'>

export function computeProfileHash(fields: HashableFields): string {
  const payload = JSON.stringify({
    income_monthly: fields.income_monthly,
    expenses: fields.expenses,
    debts: fields.debts,
    goals: fields.goals,
  })
  return createHash('sha256').update(payload).digest('hex')
}

export function isProfileStale(storedHash: string | null, currentProfile: HashableFields): boolean {
  if (!storedHash) return true
  return storedHash !== computeProfileHash(currentProfile)
}
