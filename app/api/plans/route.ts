import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { computeProfileHash, isProfileStale } from '@/lib/utils/profile-hash'
import type { DbActionPlan, DbProfile, DbUser } from '@/types/database'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data: dbUser } = await supabase
    .from('users').select('id').eq('auth_id', user.id).single() as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return NextResponse.json([], { status: 404 })

  const [plansRes, profileRes] = await Promise.all([
    supabase
      .from('action_plans')
      .select('*')
      .eq('user_id', dbUser.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('income_monthly, expenses, debts, goals')
      .eq('user_id', dbUser.id)
      .single(),
  ]) as [
    { data: DbActionPlan[] | null; error: { message: string } | null },
    { data: Pick<DbProfile, 'income_monthly' | 'expenses' | 'debts' | 'goals'> | null; error: { message: string } | null },
  ]

  if (plansRes.error) return NextResponse.json([], { status: 500 })

  const plans = plansRes.data ?? []
  const profile = profileRes.data

  const result = plans.map(plan => ({
    ...plan,
    is_stale: profile ? isProfileStale(plan.profile_snapshot_hash, profile) : false,
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const { title, steps, sessionId } = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = await (supabase.from('users') as any).select('id').eq('auth_id', user.id).single()
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  const { data: profile } = await (supabase.from('profiles') as any).select('*').eq('user_id', dbUser.id).single()
  const hash = profile ? computeProfileHash(profile) : null

  const { data } = await (supabase.from('action_plans') as any).insert({
    user_id: dbUser.id,
    session_id: sessionId || null,
    title,
    steps,
    profile_snapshot_hash: hash,
  }).select().single()

  return NextResponse.json(data)
}
