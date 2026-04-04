import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { computeProfileHash } from '@/lib/utils/profile-hash'

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
