'use client'
import { useState } from 'react'
import { Button } from '@heroui/react'
import type { MiniGameProps } from '@/types/components'
import type { DbProfile } from '@/types/database'
import { useSFX } from '@/components/audio/use-sfx'
import { useInteractionEvent } from '@/lib/ai/interaction-events'
import { TermMatch } from '@/components/games/TermMatch'
import { FinWord } from '@/components/games/FinWord'
import { WealthFarm } from '@/components/games/WealthFarm'
import { RiskRaid } from '@/components/games/RiskRaid'
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

  if (game_type === 'risk_raid') return <RiskRaid onComplete={handleSubGameComplete} />
  if (game_type === 'term_match') return <TermMatch onComplete={handleSubGameComplete} />
  if (game_type === 'fin_word') return <FinWord onComplete={handleSubGameComplete} />
  if (game_type === 'wealth_farm') return <WealthFarm onComplete={handleSubGameComplete} />
  if (game_type === 'insurance_card_game')
    return <InsuranceCardGame onComplete={handleSubGameComplete} />
  if (game_type === 'credit_quest_game') return <CreditQuestGame />
  if (game_type === 'tradeoff_slider')
    return (
      <TradeoffSlider
        title={title}
        instructions={instructions!}
        income={income!}
        categories={categories!}
        win_condition={win_condition!}
        onResult={handleResult}
      />
    )
  return null
}

type BudgetGameProps = {
  title: string
  instructions: string
  income: number
  categories: NonNullable<MiniGameProps['categories']>
  win_condition: string
  onResult?: (won: boolean) => void
}

type AnalysisState = 'idle' | 'loading' | 'done' | 'error'

function buildPrompt(
  profile: DbProfile | null,
  allocations: Record<string, number>,
  income: number
): string {
  const allocationLines = Object.entries(allocations)
    .map(([k, v]) => `- ${k}: $${v}`)
    .join('\n')

  if (!profile) {
    return `You are a financial wellness advisor. Analyze this budget allocation against common best-practice ratios (e.g. 50/30/20).

GAME ALLOCATION (monthly, out of $${income}):
${allocationLines}

Provide a concise analysis (3–5 sentences). Comment on the balance between needs, wants, savings, and debt payoff. Suggest one concrete adjustment if something looks off. Be warm and non-judgmental.`
  }

  const debtSummary =
    profile.debts.length > 0
      ? profile.debts.map((d) => `${d.type} $${d.amount} at ${d.rate}%`).join(', ')
      : 'none'
  const goalSummary =
    profile.goals.length > 0
      ? profile.goals.map((g) => `${g.label} ($${g.target_amount} by ${g.target_date})`).join(', ')
      : 'none stated'
  const language = profile.language === 'es' ? 'Spanish' : 'English'

  return `You are a financial wellness advisor. Analyze whether this budget allocation is optimal for this specific user.

USER PROFILE:
- Persona: ${profile.persona.replace(/_/g, ' ')}
- Income type: ${profile.income_type}
- Monthly income: $${profile.income_monthly}
- Savings balance: $${profile.savings_balance}
- Debts: ${debtSummary}
- Financial goals: ${goalSummary}
- Financial health score: ${profile.financial_health_score}/100

GAME ALLOCATION (monthly, out of $${income}):
${allocationLines}

Provide a concise, personalized analysis (3–5 sentences). Do NOT just say whether categories crossed a threshold. Instead:
- Comment on whether the savings rate fits their life stage and goals
- Note if the debt payoff rate is appropriate given their actual debt load
- Highlight any imbalance specific to their persona (e.g., a gig worker needs a larger emergency fund than a salaried employee)
- Suggest one concrete adjustment if something looks off
- Be warm and non-judgmental. Respond in ${language}.`
}

function TradeoffSlider({
  title,
  instructions,
  income,
  categories,
  win_condition: _win_condition,
  onResult,
}: BudgetGameProps) {
  const { play, SFX } = useSFX()
  const [allocations, setAllocations] = useState<Record<string, number>>(
    Object.fromEntries(categories.map((c) => [c.name, c.suggested]))
  )
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle')
  const [analysisText, setAnalysisText] = useState('')

  const total = Object.values(allocations).reduce((a, b) => a + b, 0)
  const remaining = income - total

  async function check() {
    const valid = categories.every(
      (c) => allocations[c.name] >= c.min && allocations[c.name] <= c.max
    )
    const won = valid && remaining >= 0
    play(won ? SFX.GAME_WIN : SFX.GAME_LOSE)
    onResult?.(won)

    setAnalysisState('loading')
    try {
      const profileRes = await fetch('/api/profile')
      const profile: DbProfile | null = profileRes.ok ? await profileRes.json() : null

      const prompt = buildPrompt(profile, allocations, income)
      const insightRes = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      if (!insightRes.ok) throw new Error('insight failed')
      const { text } = await insightRes.json()
      setAnalysisText(text)
      setAnalysisState('done')
    } catch {
      setAnalysisState('error')
    }
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
      <Button
        onPress={check}
        isDisabled={analysisState === 'loading'}
        variant="primary"
        className="clay-btn"
      >
        {analysisState === 'loading' ? 'Analyzing…' : 'Check my budget'}
      </Button>
      {analysisState === 'loading' && (
        <p className="text-sm text-default-500 animate-pulse">Analyzing your allocation…</p>
      )}
      {analysisState === 'done' && (
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 text-sm text-default-700 leading-relaxed whitespace-pre-line">
          {analysisText}
        </div>
      )}
      {analysisState === 'error' && (
        <p className="text-sm text-danger">Could not load analysis. Please try again.</p>
      )}
    </div>
  )
}
