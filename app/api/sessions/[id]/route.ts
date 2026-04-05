import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = await (supabase.from('users') as any).select('id').eq('auth_id', user.id).single()
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  // Delete messages first to avoid FK constraint issues
  await (supabase.from('messages') as any).delete().eq('session_id', id)

  // Nullify session_id on saved items so they remain in the library
  await (supabase.from('saved_items') as any)
    .update({ session_id: null })
    .eq('session_id', id)
    .eq('user_id', dbUser.id)

  // Delete the session (only if it belongs to this user)
  const { error } = await (supabase.from('chat_sessions') as any)
    .delete()
    .eq('id', id)
    .eq('user_id', dbUser.id)

  if (error) return NextResponse.json(null, { status: 500 })

  return NextResponse.json({ ok: true })
}
