import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { DbSavedItem, DbUser } from '@/types/database'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data: dbUser } = await supabase
    .from('users').select('id').eq('auth_id', user.id).single() as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return NextResponse.json([], { status: 404 })

  const { data, error } = await supabase
    .from('saved_items')
    .select('*')
    .eq('user_id', dbUser.id)
    .order('created_at', { ascending: false }) as { data: DbSavedItem[] | null; error: { message: string } | null }

  if (error) return NextResponse.json([], { status: 500 })

  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const { sessionId, componentName, componentProps, title } = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = await (supabase.from('users') as any).select('id').eq('auth_id', user.id).single()
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  const typeMap: Record<string, string> = {
    crisis_simulator: 'simulation', mini_game: 'game',
    learning_card: 'learning', action_plan: 'plan',
    document_explainer: 'document',
  }

  const { data } = await (supabase.from('saved_items') as any).insert({
    user_id: dbUser.id,
    session_id: sessionId || null,
    type: typeMap[componentName] || 'simulation',
    component_name: componentName,
    component_props: componentProps,
    title,
  }).select().single()

  return NextResponse.json(data)
}
