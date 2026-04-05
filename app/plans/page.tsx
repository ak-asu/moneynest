'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppNav } from '@/components/app-nav'
import { Chip } from '@heroui/react'
import { CheckCircle2, Circle } from 'lucide-react'
import type { DbActionPlan } from '@/types/database'

type PlanWithStaleness = DbActionPlan & { is_stale: boolean }

function formatDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Unknown date'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

function PlanCard({
  plan,
  onUpdate,
}: {
  plan: PlanWithStaleness
  onUpdate: (updated: PlanWithStaleness) => void
}) {
  const [saving, setSaving] = useState(false)

  const total = plan.steps.length
  const done = plan.steps.filter((s) => s.completed).length
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0

  async function toggleStep(index: number) {
    const updatedSteps = plan.steps.map((s, i) =>
      i === index ? { ...s, completed: !s.completed } : s
    )
    const optimistic: PlanWithStaleness = {
      ...plan,
      steps: updatedSteps,
      completed_steps: updatedSteps.filter((s) => s.completed).length,
    }
    onUpdate(optimistic)

    setSaving(true)
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: updatedSteps }),
      })
      if (res.ok) {
        const persisted = await res.json()
        onUpdate({ ...persisted, is_stale: plan.is_stale })
      }
    } catch (err) {
      console.error('Failed to save step', err)
      onUpdate(plan) // revert on error
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="clay-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-base leading-snug flex-1 min-w-0">{plan.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {plan.is_stale && (
            <Chip size="sm" color="warning" variant="soft" className="text-xs">
              Based on older profile
            </Chip>
          )}
          {pct === 100 && (
            <Chip size="sm" color="success" variant="soft" className="text-xs">
              Complete
            </Chip>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-default-500">
          <span>
            {done} of {total} steps done
          </span>
          <span>{pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${done} of ${total} steps completed`}
          className="w-full bg-default-200 rounded-full h-2"
        >
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <ol className="flex flex-col gap-2">
        {plan.steps.map((step, i) => (
          <li
            key={i}
            onClick={() => !saving && toggleStep(i)}
            className="flex items-start gap-3 p-3 rounded-2xl bg-default-50 cursor-pointer hover:bg-default-100 transition-colors select-none"
          >
            {step.completed ? (
              <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
            ) : (
              <Circle size={18} className="text-default-300 shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className={`text-sm font-medium ${step.completed ? 'line-through text-default-400' : ''}`}
              >
                {step.label}
                {step.amount != null && (
                  <span className="text-primary ml-1.5">${step.amount.toLocaleString()}</span>
                )}
              </span>
              {step.detail && <span className="text-xs text-default-500">{step.detail}</span>}
              {step.deadline && (
                <span className="text-xs text-warning-600">by {step.deadline}</span>
              )}
            </div>
          </li>
        ))}
      </ol>

      <p className="text-xs text-default-400">Created {formatDate(plan.created_at)}</p>
    </div>
  )
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanWithStaleness[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/plans')
      if (!res.ok) {
        setFetchError(`Failed to load plans (${res.status}). Please try again.`)
        return
      }
      const data: PlanWithStaleness[] = await res.json()
      setPlans(data)
    } catch {
      setFetchError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const updatePlan = useCallback((updated: PlanWithStaleness) => {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <main aria-label="Action plans" className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-3xl">
          <div>
            <h1 className="text-2xl font-bold">Action Plans</h1>
            <p className="text-default-500 text-sm mt-1">
              Your personalised financial action plans from Vela.
            </p>
          </div>

          {loading ? (
            <p className="text-default-400 text-sm">Loading…</p>
          ) : fetchError ? (
            <p className="text-danger text-sm">{fetchError}</p>
          ) : plans.length === 0 ? (
            <div className="clay-card p-8 text-center">
              <p className="font-semibold text-default-600">No action plans yet</p>
              <p className="text-default-400 text-sm mt-1">
                Ask Vela in chat to create a plan for you.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} onUpdate={updatePlan} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
