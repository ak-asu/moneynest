import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { DbLeaderboardEntry } from '@/types/database'

export async function GET() {
  const supabase = await createClient()

  const [{ data: xpData }, { data: usersData }] = await Promise.all([
    (supabase.from('game_xp') as any).select('user_id, xp_earned'),
    (supabase.from('users') as any).select('id, email'),
  ])

  const xpByUser: Record<string, number> = {}
  for (const row of xpData ?? []) {
    xpByUser[row.user_id] = (xpByUser[row.user_id] ?? 0) + row.xp_earned
  }

  const emailById: Record<string, string> = {}
  for (const u of usersData ?? []) {
    emailById[u.id] = u.email
  }

  const sorted = Object.entries(xpByUser)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)

  const leaderboard: DbLeaderboardEntry[] = sorted.map(([userId, total_xp], i) => {
    const email = emailById[userId] ?? ''
    const display_name = email.split('@')[0] ?? 'Player'
    return { display_name, total_xp, rank: i + 1 }
  })

  return NextResponse.json(leaderboard)
}
