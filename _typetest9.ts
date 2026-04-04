// Use the actual GenericSchema from supabase-js
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types/database'

// Extract Schema type from SupabaseClient<Database>
type MyClient = SupabaseClient<Database>
// Check using conditional
type Schema = Database['public']

// The critical check - does Database['public'] extend the GenericSchema in supabase?
// We can test by checking if SupabaseClient<Database>.from('users') exists
type FromMethod = MyClient extends { from(relation: 'users'): infer R } ? R : 'from users not found'
// Check upsert
type UpsertArgs = FromMethod extends { upsert(values: infer V, options?: unknown): unknown } ? V : 'no upsert'
