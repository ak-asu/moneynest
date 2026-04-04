// Reproduce the exact createClient pattern
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

async function test() {
  const cookieStore = await cookies()
  const client = createServerClient<Database>(
    'url',
    'key',
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
  
  // Test: is client typed correctly?
  type ClientType = typeof client
  type IsSupabase = ClientType extends SupabaseClient<Database, 'public'> ? 'yes' : 'no'
  
  // Test from users
  const result = client.from('users').upsert(
    { auth_id: 'x', email: 'x@x.com' },
    { onConflict: 'auth_id' }
  )
}
