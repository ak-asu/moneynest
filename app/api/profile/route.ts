import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { DbProfile, DbUser } from '@/types/database'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = await supabase
    .from('users').select('id').eq('auth_id', user.id).single() as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('user_id', dbUser.id).single() as { data: DbProfile | null }

  return NextResponse.json(profile)
}
