'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppNav } from '@/components/app-nav'
import { Chip } from '@heroui/react'
import type { DbActionPlan } from '@/types/database'

type PlanWithStaleness = DbActionPlan & { is_stale: boolean }

function formatDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Unknown date'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
}

function PlanCard({ plan }: { plan: PlanWithStaleness }) {
  const total = plan.steps.length
  const done = plan.completed_steps
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0

  return (
    <div className="clay-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-sm leading-snug flex-1 min-w-0">{plan.title}</h3>
        {plan.is_stale && (
          <Chip size="sm" color="warning" variant="soft" className="shrink-0 text-xs">
            Based on older profile
          </Chip>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-default-500">
          <span>Progress</span>
          <span>{done}/{total} steps</span>
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

  useEffect(() => { load() }, [load])

  return (
    <div className="flex h-screen overflow-hidden">
      <AppNav />
      <main aria-label="Action plans" className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6 max-w-3xl">
          <div>
            <h1 className="text-2xl font-bold">Action Plans</h1>
            <p className="text-default-500 text-sm mt-1">Your personalised financial action plans from Vela.</p>
          </div>

          {loading ? (
            <p className="text-default-400 text-sm">Loading…</p>
          ) : fetchError ? (
            <p className="text-danger text-sm">{fetchError}</p>
          ) : plans.length === 0 ? (
            <div className="clay-card p-8 text-center">
              <p className="font-semibold text-default-600">No action plans yet</p>
              <p className="text-default-400 text-sm mt-1">Ask Vela in chat to create a plan for you.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
