import { generateText, Output } from 'ai'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropicProvider } from '@/lib/ai/anthropic'
import { computeHealthScore } from '@/lib/utils/health-score'
import type { DbProfile, DbUser } from '@/types/database'

const extractedProfileSchema = z.object({
  persona: z
    .enum(['gig_worker', 'student', 'immigrant', 'retiree', 'single_parent', 'other'])
    .nullable()
    .describe('Best-fit persona based on the user situation described'),
  income_monthly: z.number().nullable().describe('Monthly income in USD'),
  income_type: z
    .enum(['steady', 'irregular'])
    .nullable()
    .describe('"steady" for salary/regular pay, "irregular" for gig/variable'),
  expenses: z
    .object({
      rent: z.number().describe('Monthly rent/mortgage'),
      food: z.number().describe('Monthly food/groceries'),
      transport: z.number().describe('Monthly transport/car costs'),
      other: z.number().describe('All other monthly expenses'),
    })
    .nullable()
    .describe('Monthly expense breakdown in USD'),
  savings_balance: z.number().nullable().describe('Current savings balance in USD'),
  debts: z
    .array(
      z.object({
        type: z.string().describe('e.g. credit card, student loan, car loan'),
        amount: z.number().describe('Outstanding balance in USD'),
        rate: z.number().describe('Annual interest rate as a decimal, e.g. 0.18 for 18%'),
      })
    )
    .nullable()
    .describe('Debts mentioned by the user'),
  goals: z
    .array(
      z.object({
        label: z.string().describe('Short goal description'),
        target_amount: z.number().describe('Target savings amount in USD'),
        target_date: z.string().describe('ISO date string, e.g. 2026-12-31'),
      })
    )
    .nullable()
    .describe('Financial goals mentioned by the user'),
})

export async function POST(req: Request) {
  let body: { transcript: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.transcript) || body.transcript.length === 0) {
    return NextResponse.json({ error: 'transcript is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: dbUser } = (await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()) as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const transcriptText = body.transcript.join('\n')

  const { output: extracted } = await generateText({
    model: anthropicProvider('claude-haiku-4-5-20251001'),
    output: Output.object({ schema: extractedProfileSchema }),
    prompt: `You are extracting a financial profile from a Cents voice onboarding conversation.
Return null for any field the user did not mention.

For the "language" field: infer it from whichever language the user is speaking in the transcript — do NOT require them to have explicitly stated a preference. If the user's messages are in Spanish set "es", if in English set "en". Default to "en" if unclear.

Transcript:
${transcriptText}`,
  })

  const profileData: Partial<DbProfile> & { user_id: string } = {
    user_id: dbUser.id,
    onboarding_completed: true,
  }

  if (extracted.persona != null) profileData.persona = extracted.persona
  if (extracted.income_monthly != null) profileData.income_monthly = extracted.income_monthly
  if (extracted.income_type != null) profileData.income_type = extracted.income_type
  if (extracted.expenses != null) profileData.expenses = extracted.expenses
  if (extracted.savings_balance != null) profileData.savings_balance = extracted.savings_balance
  if (extracted.debts != null) profileData.debts = extracted.debts
  if (extracted.goals != null) profileData.goals = extracted.goals

  if (
    profileData.income_monthly != null &&
    profileData.expenses != null &&
    profileData.debts != null &&
    profileData.goals != null &&
    profileData.savings_balance != null
  ) {
    profileData.financial_health_score = computeHealthScore(
      profileData as DbProfile,
      profileData.savings_balance
    )
  }

  const { data, error } = await (supabase
    .from('profiles')
    .upsert(profileData as any, { onConflict: 'user_id' })
    .select()
    .single() as unknown as Promise<{ data: DbProfile | null; error: { message: string } | null }>)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ profile: data })
}
