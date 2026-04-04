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

  // Upsert profile
  const profileData: Partial<DbProfile> = {
    ...body,
    user_id: dbUser.id,
  }

  // Compute health score (requires savings balance — use 0 if not provided)
  const savingsBalance = typeof body.savings_balance === 'number' ? body.savings_balance : 0
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(profileData as any, { onConflict: 'user_id' })
    .select()
    .single() as unknown as Promise<{ data: DbProfile | null; error: { message: string } | null }>)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
