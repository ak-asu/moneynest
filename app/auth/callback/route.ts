import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const usersTable = supabase.from('users') as unknown as {
    upsert: (
      values: Database['public']['Tables']['users']['Insert'],
      options: { onConflict: string }
    ) => Promise<unknown>
  }

  await usersTable.upsert({ auth_id: user.id, email: user.email! }, { onConflict: 'auth_id' })

  return NextResponse.redirect(`${origin}/`)
}
