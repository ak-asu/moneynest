import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { computeHealthScore } from '@/lib/utils/health-score'
import type { DbProfile, DbUser } from '@/types/database'

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  // Cast needed: supabase-js@2 inference resolves some table Row types as
  // `never` when using select('id'); see known TS issue in existing routes.
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single() as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  // Only persist valid columns from profiles table.
  const profileData: Partial<DbProfile> = {
    user_id: dbUser.id,
  }

  if (body.persona != null) profileData.persona = body.persona as DbProfile['persona']
  if (body.language != null) profileData.language = body.language as DbProfile['language']
  if (body.voice_id !== undefined) profileData.voice_id = body.voice_id as DbProfile['voice_id']
  if (body.income_monthly != null) profileData.income_monthly = Number(body.income_monthly)
  if (body.income_type != null) profileData.income_type = body.income_type as DbProfile['income_type']
  if (body.expenses != null) profileData.expenses = body.expenses as DbProfile['expenses']
  if (body.debts != null) profileData.debts = body.debts as DbProfile['debts']
  if (body.goals != null) profileData.goals = body.goals as DbProfile['goals']
  if (body.onboarding_completed != null) {
    profileData.onboarding_completed = Boolean(body.onboarding_completed)
  }

  const savingsBalance = typeof body.savings_balance === 'number' ? body.savings_balance : Number(body.savings_balance) || 0
  profileData.savings_balance = savingsBalance
  if (
    profileData.income_monthly != null &&
    profileData.expenses != null &&
    profileData.debts != null &&
    profileData.goals != null
  ) {
    profileData.financial_health_score = computeHealthScore(profileData as DbProfile, savingsBalance)
  }

  const { data, error } = await (supabase
    .from('profiles')
    .upsert(profileData as any, { onConflict: 'user_id' })
    .select()
    .single() as unknown as Promise<{ data: DbProfile | null; error: { message: string } | null }>)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
