import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types/database'

declare const client: SupabaseClient<Database>
const u1 = client.from('users').upsert({ auth_id: 'x', email: 'y@y.com' })
