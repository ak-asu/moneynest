// Reproduce the exact same pattern as app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'

async function test() {
  const supabase = await createClient()
  const result = supabase.from('users').upsert(
    { auth_id: 'test', email: 'test@test.com' },
    { onConflict: 'auth_id' }
  )
  return result
}
