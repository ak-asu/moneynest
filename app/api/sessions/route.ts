import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data: dbUser } = await (supabase.from('users') as any).select('id').eq('auth_id', user.id).single()
  if (!dbUser) return NextResponse.json([])

  const { data } = await (supabase.from('chat_sessions') as any)
    .select('id, title, created_at, updated_at')
    .eq('user_id', dbUser.id)
    .order('updated_at', { ascending: false })

  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const { title } = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = await (supabase.from('users') as any).select('id').eq('auth_id', user.id).single()
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  const { data } = await (supabase.from('chat_sessions') as any)
    .insert({ user_id: dbUser.id, title: title || 'New conversation' })
    .select()
    .single()

  return NextResponse.json(data)
}
