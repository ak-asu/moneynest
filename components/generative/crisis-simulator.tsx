'use client'
import { useState, useEffect } from 'react'
import { Button, ProgressBar } from '@heroui/react'
import { AlertTriangle } from 'lucide-react'
import type { CrisisSimulatorProps } from '@/types/components'
import { useSFX } from '@/components/audio/use-sfx'
import { useMusic } from '@/components/audio/use-music'

export function CrisisSimulator({
  scenario_label, duration_days, income_monthly, fixed_expenses, savings, decision_points
}: CrisisSimulatorProps) {
  useMusic('tense')
  const { play, SFX } = useSFX()
  const [stepIndex, setStepIndex] = useState(0)
  const [day, setDay] = useState(0)
  const [balance, setBalance] = useState(savings)
  const [log, setLog] = useState<string[]>([])
  const [complete, setComplete] = useState(false)

  useEffect(() => { play(SFX.CRISIS_START) }, [play, SFX.CRISIS_START])

  const dailyExpenses = Object.values(fixed_expenses).reduce((a, b) => a + b, 0) / 30
  const currentDecision = decision_points[stepIndex]

  function makeChoice(impact: number, consequence: string) {
    const newBalance = balance + impact - dailyExpenses
    setBalance(newBalance)
    setLog(prev => [...prev, consequence])
    const nextIndex = stepIndex + 1
    if (nextIndex >= decision_points.length) {
      setComplete(true)
      setDay(duration_days)
    } else {
      setStepIndex(nextIndex)
      setDay(decision_points[nextIndex].day)
    }
    if (newBalance < 0) {
      play(SFX.CRISIS_ESCALATE)
    } else if (nextIndex >= decision_points.length) {
      play(newBalance >= 0 ? SFX.CRISIS_RESOLVE : SFX.CRISIS_ESCALATE)
    } else {
      play(SFX.CRISIS_START)
    }
  }

  const dangerLevel = balance < 0 ? 'danger' : balance < savings * 0.2 ? 'warning' : 'success'

  return (
    <div className="clay-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-warning" />
        <h3 className="font-bold text-base">{scenario_label}</h3>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-xs text-default-500 mb-1">Day {day} of {duration_days}</p>
          <ProgressBar value={(day / duration_days) * 100} color="accent" size="sm" className="mb-2" />
        </div>
        <div className="text-right">
          <p className="text-xs text-default-500">Balance</p>
          <p className={`text-lg font-bold ${balance < 0 ? 'text-danger' : 'text-success'}`}>
            ${balance.toFixed(0)}
          </p>
          <p className="text-xs text-default-500">Income: ${income_monthly.toFixed(0)}/mo</p>
        </div>
      </div>

      {log.length > 0 && (
        <div className="bg-default-50 rounded-2xl p-3 max-h-32 overflow-y-auto">
          {log.map((entry, i) => (
            <p key={i} className="text-xs text-default-600 mb-1">• {entry}</p>
          ))}
        </div>
      )}

      {!complete && currentDecision && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{currentDecision.prompt}</p>
          <div className="flex flex-wrap gap-2">
            {currentDecision.options.map((opt, i) => (
              <Button
                key={i}
                size="sm"
                variant={opt.impact >= 0 ? 'primary' : 'danger-soft'}
                onPress={() => makeChoice(opt.impact, opt.consequence)}
                className="clay-btn text-xs"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {complete && (
        <div className={`rounded-2xl p-3 ${dangerLevel === 'danger' ? 'bg-danger-50' : 'bg-success-50'}`}>
          <p className="text-sm font-semibold">
            {balance < 0 ? '⚠️ You ran out of funds.' : '✅ You made it through.'}
          </p>
          <p className="text-xs text-default-600 mt-1">
            Ending balance: ${balance.toFixed(0)} after {duration_days} days
          </p>
        </div>
      )}
    </div>
  )
}
