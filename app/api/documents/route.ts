import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data: dbUser } = await (supabase.from('users') as any)
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!dbUser) return NextResponse.json([])

  const { data } = await (supabase.from('documents') as any)
    .select('*')
    .eq('user_id', dbUser.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}
