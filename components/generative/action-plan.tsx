'use client'
import { useState } from 'react'
import { CheckCircle2, Circle, BookmarkPlus } from 'lucide-react'
import { Button } from '@heroui/react'
import type { ActionPlanProps } from '@/types/components'

export function ActionPlan({ title, steps }: ActionPlanProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  function toggle(i: number) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(i)) {
        next.delete(i)
      } else {
        next.add(i)
      }
      return next
    })
  }

  async function saveToPlans() {
    setSaving(true)
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, steps }),
      })
      if (!res.ok) throw new Error('save failed')
      setSaved(true)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="clay-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">{title}</h3>
        <div className="flex flex-col items-end gap-1">
          <Button
            size="sm"
            variant={saveError ? 'danger' : 'primary'}
            onPress={saveToPlans}
            isDisabled={saved || saving}
            className="clay-btn"
          >
            <BookmarkPlus size={14} className="inline mr-1" />
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save to Plans'}
          </Button>
          {saveError && <p className="text-xs text-danger">Failed to save. Try again.</p>}
        </div>
      </div>
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <li
            key={i}
            className="flex items-start gap-3 p-3 rounded-2xl bg-default-50 cursor-pointer"
            onClick={() => toggle(i)}
          >
            {checked.has(i)
              ? <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
              : <Circle size={18} className="text-default-300 shrink-0 mt-0.5" />}
            <div className="flex flex-col gap-0.5">
              <span className={`text-sm font-medium ${checked.has(i) ? 'line-through text-default-400' : ''}`}>
                {step.label}
                {step.amount && <span className="text-primary ml-1">${step.amount}</span>}
              </span>
              <span className="text-xs text-default-500">{step.detail}</span>
              {step.deadline && <span className="text-xs text-warning-600">by {step.deadline}</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
