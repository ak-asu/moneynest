'use client'

import { useEffect, useMemo, useState } from 'react'
import { useInteractionEvent } from '@/lib/ai/interaction-events'
import type { ProfileSnapshotProps } from '@/types/components'
import type { DbProfile } from '@/types/database'

const PERSONA_LABELS: Record<string, string> = {
  gig_worker: 'Gig Worker',
  student: 'Student',
  immigrant: 'Immigrant',
  retiree: 'Retiree',
  single_parent: 'Single Parent',
  other: 'Individual',
}

const HEALTH_TEXT_COLOR: Record<string, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

export function ProfileSnapshot({
  persona,
  health_score,
  income_monthly,
  gaps,
}: ProfileSnapshotProps) {
  const dispatchEvent = useInteractionEvent()
  const [profileData, setProfileData] = useState<Partial<DbProfile> | null>(null)
  const color = health_score >= 70 ? 'success' : health_score >= 40 ? 'warning' : 'danger'

  useEffect(() => {
    const controller = new AbortController()

    async function loadProfile() {
      try {
        const res = await fetch('/api/profile', { signal: controller.signal })
        if (!res.ok) return
        const data = (await res.json()) as Partial<DbProfile> | null
        if (!data) return
        setProfileData(data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Failed to load profile snapshot details', err)
      }
    }

    loadProfile()
    return () => controller.abort()
  }, [])

  const expenseTotal = useMemo(() => {
    const expenses = profileData?.expenses
    if (!expenses) return 0
    return Object.values(expenses).reduce((sum, amount) => {
      const value = typeof amount === 'number' ? amount : Number(amount) || 0
      return sum + value
    }, 0)
  }, [profileData])

  const resolvedIncome = profileData?.income_monthly ?? income_monthly
  const resolvedSavings = profileData?.savings_balance ?? 0
  const debtTotal = (profileData?.debts ?? []).reduce((sum, debt) => sum + (debt.amount || 0), 0)
  const goalsCount = profileData?.goals?.length ?? 0
  const monthlySurplus = resolvedIncome - expenseTotal

  const hasDetailedProfileData =
    expenseTotal > 0 || resolvedSavings > 0 || debtTotal > 0 || goalsCount > 0

  function handleGapClick(gap: { label: string; prompt: string }) {
    dispatchEvent({
      componentName: 'profile_snapshot',
      status: 'completed',
      summary: `selected gap: "${gap.label}"`,
      prompt: gap.prompt,
      autoSend: true,
    })
  }

  return (
    <div className="clay-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-default-400 uppercase tracking-wide">Your profile</p>
          <h3 className="font-bold text-lg">{PERSONA_LABELS[persona]}</h3>
        </div>
        <div className="text-center">
          <p className={`text-3xl font-extrabold ${HEALTH_TEXT_COLOR[color]}`}>{health_score}</p>
          <p className="text-xs text-default-400">/ 100</p>
        </div>
      </div>
      <p className="text-sm text-default-600">
        Income: <strong>${resolvedIncome.toLocaleString()}/mo</strong>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="clay-card p-3 rounded-xl">
          <p className="text-[11px] uppercase text-default-500">Expenses</p>
          <p className="text-sm font-semibold">${expenseTotal.toLocaleString()}/mo</p>
        </div>
        <div className="clay-card p-3 rounded-xl">
          <p className="text-[11px] uppercase text-default-500">Surplus</p>
          <p
            className={`text-sm font-semibold ${monthlySurplus < 0 ? 'text-danger' : 'text-success'}`}
          >
            ${monthlySurplus.toLocaleString()}/mo
          </p>
        </div>
        <div className="clay-card p-3 rounded-xl">
          <p className="text-[11px] uppercase text-default-500">Savings</p>
          <p className="text-sm font-semibold">${resolvedSavings.toLocaleString()}</p>
        </div>
        <div className="clay-card p-3 rounded-xl">
          <p className="text-[11px] uppercase text-default-500">Debt</p>
          <p className="text-sm font-semibold">${debtTotal.toLocaleString()}</p>
        </div>
      </div>
      {!hasDetailedProfileData && (
        <p className="text-xs text-default-500">
          Add expenses, debt, savings, or goals in your profile to unlock deeper personalized
          insights.
        </p>
      )}
      {gaps.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-default-500 uppercase">To improve your score</p>
          {gaps.map((gap, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleGapClick(gap)}
              className="clay-card p-3 flex flex-col gap-0.5 text-left hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Ask AI about: ${gap.label}`}
            >
              <p className="text-sm font-medium">{gap.label}</p>
              <p className="text-xs text-default-500">{gap.prompt}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
