import { plaidClient } from '@/lib/plaid/client'
import { fetchTransactions, normalizeTransaction } from '@/lib/plaid/sync'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { CountryCode } from 'plaid'

export async function POST(req: Request) {
  let body: { publicToken?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { publicToken } = body
  if (!publicToken) return NextResponse.json({ error: 'Missing publicToken' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  // Exchange public token for access token
  const { data: exchangeData } = await plaidClient.itemPublicTokenExchange({ public_token: publicToken })
  const { access_token, item_id } = exchangeData

  // Get institution name
  const { data: itemData } = await plaidClient.itemGet({ access_token })
  const { data: instData } = await plaidClient.institutionsGetById({
    institution_id: itemData.item.institution_id!,
    country_codes: [CountryCode.Us],
  })
  const institutionName = instData.institution.name

  // Store connection
  await (supabase as any).from('plaid_connections').upsert({
    user_id: (dbUser as { id: string }).id,
    access_token,
    item_id,
    institution_name: institutionName,
    last_synced: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  // Sync last 30 days
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const transactions = await fetchTransactions(access_token, startDate, endDate)
  const normalized = transactions.map(t => ({ ...normalizeTransaction(t), user_id: (dbUser as { id: string }).id }))

  if (normalized.length > 0) {
    await supabase.from('budget_entries').upsert(normalized as any, { onConflict: 'id' })
  }

  // Mark onboarding complete
  await (supabase as any).from('profiles').upsert(
    { user_id: (dbUser as { id: string }).id, onboarding_completed: true },
    { onConflict: 'user_id' }
  )

  return NextResponse.json({ success: true, transactionCount: normalized.length, institutionName })
}
