import type { DbProfile } from '@/types/database'

/**
 * Score formula (0-100):
 * 40% savings rate (monthly_savings / income_monthly)
 * 30% debt-to-income ratio (inverse: lower debt = higher score)
 * 20% emergency fund coverage (months of expenses covered by savings)
 * 10% goal progress (goals with target_date in future vs past)
 *
 * Each component is normalized to 0-100, then weighted.
 */
export function computeHealthScore(profile: DbProfile, savingsBalance: number): number {
  const income = profile.income_monthly || 1
  const totalExpenses = Object.values(profile.expenses as Record<string, number>).reduce(
    (a, b) => a + b,
    0
  )
  const totalDebt = (profile.debts as Array<{ amount: number }>).reduce((a, d) => a + d.amount, 0)
  const goals = profile.goals as Array<{ target_date: string }>

  // Savings rate component (40%)
  const monthlySavings = Math.max(0, income - totalExpenses)
  const savingsRate = Math.min(monthlySavings / income, 1)
  const savingsScore = savingsRate * 100

  // Debt-to-income component (30%) — monthly debt service approximation
  const monthlyDebt = totalDebt > 0 ? totalDebt * 0.02 : 0 // rough 2% monthly
  const dtiRatio = Math.min(monthlyDebt / income, 1)
  const debtScore = (1 - dtiRatio) * 100

  // Emergency fund component (20%) — months of expenses covered
  const monthsOfCoverage = totalExpenses > 0 ? savingsBalance / totalExpenses : 0
  const emergencyScore = Math.min(monthsOfCoverage / 6, 1) * 100 // 6 months = 100

  // Goal progress component (10%)
  const now = new Date()
  const activeGoals = goals.filter((g) => new Date(g.target_date) > now)
  const goalScore = goals.length > 0 ? (activeGoals.length / goals.length) * 100 : 50

  return Math.round(savingsScore * 0.4 + debtScore * 0.3 + emergencyScore * 0.2 + goalScore * 0.1)
}
