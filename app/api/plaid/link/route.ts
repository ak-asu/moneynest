import { plaidClient } from '@/lib/plaid/client'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { CountryCode, Products } from 'plaid'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: 'Vela',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
  })

  return NextResponse.json({ linkToken: response.data.link_token })
}
