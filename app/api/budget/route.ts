import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { DbBudgetEntry, DbUser } from '@/types/database'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '90') || 90, 365)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data: dbUser } = (await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()) as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return NextResponse.json([], { status: 404 })

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data } = await (supabase
    .from('budget_entries')
    .select('*')
    .eq('user_id', dbUser.id)
    .gte('date', since)
    .order('date', { ascending: false }) as unknown as Promise<{ data: DbBudgetEntry[] | null }>)

  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { category, amount, entry_type, date } = body
  if (typeof category !== 'string' || !category.trim()) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 })
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
  }
  if (entry_type !== 'income' && entry_type !== 'expense') {
    return NextResponse.json({ error: 'entry_type must be income or expense' }, { status: 400 })
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = (await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()) as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  const { data, error } = await ((supabase.from('budget_entries') as any)
    .insert({
      category: category.trim().slice(0, 100),
      amount,
      entry_type,
      date,
      user_id: dbUser.id,
      source: 'manual',
    })
    .select()
    .single() as unknown as Promise<{
    data: DbBudgetEntry | null
    error: { message: string } | null
  }>)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
