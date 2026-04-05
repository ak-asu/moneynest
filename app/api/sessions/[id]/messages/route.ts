import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data } = await (supabase.from('messages') as any)
    .select('*')
    .eq('session_id', id)
    .order('created_at', { ascending: true })

  // Convert DB messages to UIMessage format for ai@6 useChat
  // Each message needs: id, role, parts
  const messages = ((data as import('@/types/database').DbMessage[]) || []).map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [
      ...(m.text ? [{ type: 'text' as const, text: m.text }] : []),
      ...(m.components || []).map((c: { name: string; props: unknown }) => ({
        type: `tool-${c.name}` as `tool-${string}`,
        toolCallId: crypto.randomUUID(),
        toolName: c.name,
        state: 'output-available' as const,
        input: {},
        output: c.props,
      })),
    ],
  }))

  return NextResponse.json(messages)
}
