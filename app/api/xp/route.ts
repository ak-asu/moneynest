import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { gameType, xpEarned, reason } = await req.json()
  if (!gameType || typeof xpEarned !== 'number' || xpEarned < 0) {
    return NextResponse.json(null, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = await (supabase.from('users') as any)
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  const { data, error } = await (supabase.from('game_xp') as any)
    .insert({
      user_id: dbUser.id,
      game_type: gameType,
      xp_earned: xpEarned,
      reason: reason ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json(null, { status: 500 })
  return NextResponse.json(data)
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ total: 0 })

  const { data: dbUser } = await (supabase.from('users') as any)
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!dbUser) return NextResponse.json({ total: 0 })

  const { data } = await (supabase.from('game_xp') as any)
    .select('xp_earned')
    .eq('user_id', dbUser.id)

  const total: number = (data ?? []).reduce(
    (sum: number, row: { xp_earned: number }) => sum + row.xp_earned,
    0
  )
  return NextResponse.json({ total })
}
