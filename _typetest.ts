import type { Database } from './types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// Verify Schema resolves to Database['public']
type TestSchema = Database['public'] extends { Tables: Record<string, unknown>; Views: Record<string, unknown>; Functions: Record<string, unknown> } ? 'satisfies' : 'fails'

// Try from directly
declare const client: SupabaseClient<Database>
const userQuery = client.from('users').select('id')
