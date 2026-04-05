import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parseCSV } from '@/lib/utils/csv-parser'
import type { DbUser } from '@/types/database'

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = await supabase
    .from('users').select('id').eq('auth_id', user.id).single() as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  const entries = parseCSV(text)
  if (!entries.length) return NextResponse.json({ error: 'No valid entries found in CSV' }, { status: 422 })

  const rows = entries.map(e => ({ ...e, user_id: dbUser.id }))

  const { error } = await (supabase.from('budget_entries') as any).insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ imported: rows.length })
}
