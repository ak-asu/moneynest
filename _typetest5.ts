import type { Database } from './types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

// Create SupabaseClient<Database, 'public'> type
type Client = SupabaseClient<Database, 'public'>

// What does from('users') return?
type FromUsers = ReturnType<Client['from']>
// What's the Insert type for users in the schema?
type Schema = Database['public']
type UsersTable = Schema['Tables']['users']
type UsersInsert = UsersTable['Insert']

// Direct from type
declare const c: Client
type DirectFrom = typeof c extends { from(relation: 'users'): infer R } ? R : 'no match'
