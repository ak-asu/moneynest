'use client'
import { useState, useEffect } from 'react'
import type { GameConfig } from './types'
import type { DbProfile } from '@/types/database'

function buildPrompt(profile: DbProfile | null): string {
  const profileSection = profile
    ? `USER PROFILE:
- Persona: ${profile.persona.replace(/_/g, ' ')}
- Income type: ${profile.income_type}
- Monthly income: $${profile.income_monthly}
- Savings balance: $${profile.savings_balance}
- Debts: ${profile.debts.length > 0 ? profile.debts.map((d) => `${d.type} $${d.amount} at ${d.rate}%`).join(', ') : 'none'}
- Financial health score: ${profile.financial_health_score}/100`
    : 'USER PROFILE: Not available. Generate a moderate-risk American teen scenario with plausible, relatable data.'

  return `You are generating config for a financial risk education game for American teens. Return ONLY valid JSON — no markdown fences, no explanation, nothing else.

${profileSection}

Return this exact JSON structure (fill all fields):
{
  "risk_score": <integer 0-100>,
  "risk_label": <"Low Risk" | "Moderate Risk" | "High Risk">,
  "mock_context": [<2-3 short strings of relatable teen financial facts used to fill profile gaps, e.g. "Spends ~$90/mo on subscriptions">],
  "wave1": {
    "zombies": [<4-6 ZombieSpec objects>],
    "debrief_concept": <string, e.g. "Compound Interest">,
    "debrief_explanation": <2-3 plain-English sentences for a teenager>
  },
  "wave2": {
    "zombies": [<5-7 ZombieSpec objects, notably harder than wave1>],
    "debrief_concept": <different concept from wave1>,
    "debrief_explanation": <2-3 sentences>
  },
  "insights": [<exactly 3 actionable insight strings, personalized to the profile>],
  "financial_story": <1 paragraph connecting what happened in-game to the user's real financial situation>
}

Each ZombieSpec:
{
  "id": <one of: "medical_bill" | "job_loss" | "overspend" | "high_interest_debt" | "rent_spike" | "market_crash">,
  "emoji": <the matching emoji for this zombie type>,
  "label": <e.g. "Medical Bill Zombie">,
  "hp": <integer 60-160 in wave1, 100-220 in wave2>,
  "speed": <1 | 2 | 3>,
  "damage": <integer 10-30>,
  "lesson": <string — MUST include a real financial statistic or named concept with a number, e.g. "A credit card at 24% APR doubles your debt in 3 years if you only pay the minimum.">,
  "cascades_to": <optional zombie id to spawn on breakthrough — only include when it makes financial sense>
}

Rules:
- wave2 must have higher average HP and speed than wave1
- Include at least one "cascades_to" relationship total across both waves
- Include "market_crash" in wave2 if risk_score > 55
- lesson strings must NOT be generic — they must cite real numbers (APR %, dollar amounts, months, ratios)
- insights must reference the user's actual numbers where profile is available`
}

export interface LlmConfigResult {
  config: GameConfig | null
  loading: boolean
  error: string | null
}

export function useLlmConfig(): LlmConfigResult {
  const [config, setConfig] = useState<GameConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const profileRes = await fetch('/api/profile')
        const profile: DbProfile | null = profileRes.ok ? await profileRes.json() : null

        const prompt = buildPrompt(profile)
        const aiRes = await fetch('/api/ai-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        })
        if (!aiRes.ok) throw new Error(`ai-insight returned ${aiRes.status}`)
        const { text } = await aiRes.json()

        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('Response contained no JSON object')
        const parsed: GameConfig = JSON.parse(jsonMatch[0])

        if (!cancelled) setConfig(parsed)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load game config')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { config, loading, error }
}
