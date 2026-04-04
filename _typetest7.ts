import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types/database'

async function test() {
  const client: SupabaseClient<Database> = createServerClient<Database>(
    'url', 'key',
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
  
  const correct = client.from('users').upsert(
    { auth_id: 'x', email: 'x@x.com' },
    { onConflict: 'auth_id' }
  )
}
