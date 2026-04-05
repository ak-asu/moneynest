'use client'
import { useState, useEffect, useRef } from 'react'
import { Button, ProgressBar } from '@heroui/react'
import type { MiniGameProps } from '@/types/components'
import { useSFX } from '@/components/audio/use-sfx'
import { useInteractionEvent } from '@/lib/ai/interaction-events'
import { TermMatch } from '@/components/games/TermMatch'
import { FinWord } from '@/components/games/FinWord'
import { WealthFarm } from '@/components/games/WealthFarm'
import InsuranceCardGame from './insurance-card-game'
import { CreditQuestGame } from './credit-quest-game'

// Renders the appropriate game engine based on game_type
export function MiniGame({
  game_type,
  title,
  instructions,
  income,
  categories,
  win_condition,
  time_limit_seconds,
}: MiniGameProps) {
  const dispatchEvent = useInteractionEvent()

  function handleResult(won: boolean) {
    dispatchEvent({
      componentName: `mini_game (${game_type})`,
      status: 'completed',
      summary: `game: "${title}" — ${won ? `Won. ${win_condition ?? ''}` : 'Lost. Budget overrun or time expired.'}`,
      autoSend: true,
    })
  }

  function handleSubGameComplete(summary: string) {
    dispatchEvent({
      componentName: `mini_game (${game_type})`,
      status: 'completed',
      summary,
      autoSend: true,
    })
  }

  if (game_type === 'term_match') return <TermMatch onComplete={handleSubGameComplete} />
  if (game_type === 'fin_word') return <FinWord onComplete={handleSubGameComplete} />
  if (game_type === 'wealth_farm') return <WealthFarm onComplete={handleSubGameComplete} />
  if (game_type === 'insurance_card_game')
    return <InsuranceCardGame onComplete={handleSubGameComplete} />
  if (game_type === 'credit_quest_game') return <CreditQuestGame />
  if (game_type === 'allocation_puzzle')
    return (
      <AllocationPuzzle
        title={title}
        instructions={instructions!}
        income={income!}
        categories={categories!}
        win_condition={win_condition!}
        onResult={handleResult}
      />
    )
  if (game_type === 'time_pressure')
    return (
      <TimePressureGame
        title={title}
        instructions={instructions!}
        income={income!}
        categories={categories!}
        win_condition={win_condition!}
        time_limit_seconds={time_limit_seconds || 60}
        onResult={handleResult}
      />
    )
  // Default: drag_drop / tradeoff_slider fallback to allocation_puzzle layout
  return (
    <AllocationPuzzle
      title={title}
      instructions={instructions!}
      income={income!}
      categories={categories!}
      win_condition={win_condition!}
      onResult={handleResult}
    />
  )
}

type BudgetGameProps = {
  title: string
  instructions: string
  income: number
  categories: NonNullable<MiniGameProps['categories']>
  win_condition: string
  onResult?: (won: boolean) => void
}

function AllocationPuzzle({
  title,
  instructions,
  income,
  categories,
  win_condition,
  onResult,
}: BudgetGameProps) {
  const { play, SFX } = useSFX()
  const [allocations, setAllocations] = useState<Record<string, number>>(
    Object.fromEntries(categories.map((c) => [c.name, c.suggested]))
  )
  const [won, setWon] = useState<boolean | null>(null)

  const total = Object.values(allocations).reduce((a, b) => a + b, 0)
  const remaining = income - total

  function check() {
    const valid = categories.every(
      (c) => allocations[c.name] >= c.min && allocations[c.name] <= c.max
    )
    const won = valid && remaining >= 0
    setWon(won)
    play(won ? SFX.GAME_WIN : SFX.GAME_LOSE)
    onResult?.(won)
  }

  return (
    <div className="clay-card p-5 flex flex-col gap-4">
      <h3 className="font-bold text-base">{title}</h3>
      <p className="text-sm text-default-600">{instructions}</p>
      <div className="flex justify-between text-sm">
        <span>
          Income: <strong>${income}</strong>
        </span>
        <span className={remaining < 0 ? 'text-danger font-bold' : 'text-success font-bold'}>
          Remaining: ${remaining}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {categories.map((cat) => (
          <div key={cat.name} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{cat.name}</span>
              <span className="text-default-500">${allocations[cat.name]}</span>
            </div>
            <input
              type="range"
              min={cat.min}
              max={cat.max}
              value={allocations[cat.name]}
              onChange={(e) =>
                setAllocations((prev) => ({ ...prev, [cat.name]: Number(e.target.value) }))
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-default-400">
              <span>min ${cat.min}</span>
              <span>max ${cat.max}</span>
            </div>
          </div>
        ))}
      </div>
      <Button onPress={check} variant="primary" className="clay-btn">
        Check my budget
      </Button>
      {won === true && <p className="text-success font-semibold text-sm">✅ {win_condition}</p>}
      {won === false && (
        <p className="text-danger font-semibold text-sm">
          ⚠️ Some categories are out of range or you've overspent.
        </p>
      )}
    </div>
  )
}

function TimePressureGame({
  title,
  instructions,
  income,
  categories,
  win_condition,
  time_limit_seconds,
  onResult,
}: BudgetGameProps & { time_limit_seconds: number }) {
  const { play, SFX } = useSFX()
  const [timeLeft, setTimeLeft] = useState(time_limit_seconds)
  const [started, setStarted] = useState(false)
  const [allocations, setAllocations] = useState<Record<string, number>>(
    Object.fromEntries(categories.map((c) => [c.name, c.suggested]))
  )
  const [result, setResult] = useState<'win' | 'lose' | null>(null)
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  })

  useEffect(() => {
    if (!started || timeLeft <= 0 || result) return
    const t = setTimeout(() => {
      if (timeLeft === 1) {
        setResult('lose')
        onResultRef.current?.(false)
      }
      setTimeLeft((t) => t - 1)
    }, 1000)
    return () => clearTimeout(t)
  }, [started, timeLeft, result])

  const total = Object.values(allocations).reduce((a, b) => a + b, 0)

  function submit() {
    const valid = categories.every(
      (c) => allocations[c.name] >= c.min && allocations[c.name] <= c.max
    )
    const won = valid && total <= income
    setResult(won ? 'win' : 'lose')
    play(won ? SFX.GAME_WIN : SFX.GAME_LOSE)
    onResult?.(won)
  }

  return (
    <div className="clay-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">{title}</h3>
        {started && (
          <span className={`font-bold text-lg ${timeLeft < 10 ? 'text-danger' : 'text-primary'}`}>
            {timeLeft}s
          </span>
        )}
      </div>
      {!started && (
        <Button onPress={() => setStarted(true)} variant="primary" className="clay-btn">
          Start Challenge
        </Button>
      )}
      {started && !result && (
        <>
          <p className="text-sm text-default-600">{instructions}</p>
          <ProgressBar
            value={(timeLeft / time_limit_seconds) * 100}
            color={timeLeft < 10 ? 'danger' : 'accent'}
            size="sm"
          />
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center gap-3">
              <span className="text-sm w-24 shrink-0">{cat.name}</span>
              <input
                type="range"
                min={cat.min}
                max={cat.max}
                value={allocations[cat.name]}
                onChange={(e) =>
                  setAllocations((prev) => ({ ...prev, [cat.name]: Number(e.target.value) }))
                }
                className="flex-1 accent-primary"
              />
              <span className="text-sm w-12 text-right">${allocations[cat.name]}</span>
            </div>
          ))}
          <Button onPress={submit} variant="secondary" className="clay-btn">
            Submit
          </Button>
        </>
      )}
      {result === 'win' && <p className="text-success font-bold">✅ {win_condition}</p>}
      {result === 'lose' && (
        <p className="text-danger font-bold">⏱️ Time's up or budget overrun. Try again!</p>
      )}
    </div>
  )
}
