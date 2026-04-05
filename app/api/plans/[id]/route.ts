import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { steps } = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = await (supabase.from('users') as any).select('id').eq('auth_id', user.id).single()
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  const completed_steps = (steps as Array<{ completed?: boolean }>).filter(s => s.completed).length

  const { data, error } = await (supabase.from('action_plans') as any)
    .update({ steps, completed_steps, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', dbUser.id)
    .select()
    .single()

  if (error) return NextResponse.json(null, { status: 500 })
  return NextResponse.json(data)
}
