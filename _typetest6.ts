import { createServerClient } from '@supabase/ssr'
import type { Database } from './types/database'

async function test() {
  // Using explicit type annotation vs inferred
  const client = createServerClient<Database>(
    'url', 'key',
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
  
  // Debug: what is the type of client.from('users')?
  // Let's cast and check
  const builder = client.from('users')
  // @ts-expect-error
  const wrongUpsert = builder.upsert({ wrong: 'type' })
  
  // Try the correct shape
  const correct = builder.upsert({ auth_id: 'x', email: 'x@x.com' }, { onConflict: 'auth_id' })
}
