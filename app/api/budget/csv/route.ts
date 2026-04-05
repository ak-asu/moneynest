import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseCSV } from '@/lib/utils/csv-parser'
import type { DbBudgetEntry, DbUser } from '@/types/database'

export async function POST(req: Request) {
  const MAX_BYTES = 5 * 1024 * 1024
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > MAX_BYTES) {
    return NextResponse.json({ error: 'CSV too large (max 5 MB)' }, { status: 413 })
  }
  const text = await req.text()
  if (text.length > MAX_BYTES) {
    return NextResponse.json({ error: 'CSV too large (max 5 MB)' }, { status: 413 })
  }
  if (!text.trim()) return NextResponse.json({ error: 'Empty body' }, { status: 400 })

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

  const entries = parseCSV(text)
  if (!entries.length)
    return NextResponse.json({ error: 'No valid entries found in CSV' }, { status: 422 })

  const rows = entries.map((e) => ({ ...e, user_id: dbUser.id }))

  const { error } = await (supabase.from('budget_entries') as any).insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Spike detection — fire-and-forget (never blocks the import response)
  void detectAndInsertSpikes(supabase, dbUser.id)

  return NextResponse.json({ imported: rows.length })
}

async function detectAndInsertSpikes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<void> {
  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [currentRes, prevRes] = await Promise.all([
    (supabase.from('budget_entries') as any)
      .select('category, amount')
      .eq('user_id', userId)
      .eq('entry_type', 'expense')
      .gte('date', d30)
      .lte('date', today) as unknown as Promise<{
      data: Pick<DbBudgetEntry, 'category' | 'amount'>[] | null
    }>,
    (supabase.from('budget_entries') as any)
      .select('category, amount')
      .eq('user_id', userId)
      .eq('entry_type', 'expense')
      .gte('date', d60)
      .lt('date', d30) as unknown as Promise<{
      data: Pick<DbBudgetEntry, 'category' | 'amount'>[] | null
    }>,
  ])

  const current = currentRes.data ?? []
  const prev = prevRes.data ?? []

  if (!prev.length) return // no baseline to compare against

  const sum = (rows: Pick<DbBudgetEntry, 'category' | 'amount'>[], cat: string) =>
    rows.filter((r) => r.category === cat).reduce((s, r) => s + r.amount, 0)

  const currentTotals: Record<string, number> = {}
  for (const r of current) {
    currentTotals[r.category] = (currentTotals[r.category] ?? 0) + r.amount
  }

  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  for (const [category, currentAmt] of Object.entries(currentTotals)) {
    const prevAmt = sum(prev, category)
    if (prevAmt <= 0) continue // new category — no baseline
    if (currentAmt <= prevAmt * 1.2) continue // within 20% — not a spike

    await (supabase.from('suggestions') as any).insert({
      user_id: userId,
      type: 'insight',
      title: `${category} spending up ${Math.round((currentAmt / prevAmt - 1) * 100)}% this period`,
      reason: `Your ${category} spending was $${Math.round(currentAmt)} this period vs $${Math.round(prevAmt)} last period.`,
      severity: 'medium',
      chat_seed: `My ${category} spending jumped this month — can you help me understand and make a plan?`,
      expires_at: expiresAt,
      dismissed: false,
    })
  }
}
