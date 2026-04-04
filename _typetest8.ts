import type { DbUser } from './types/database'

type TestInsert = Omit<DbUser, 'id' | 'created_at'>
// Does it satisfy Record<string, unknown>?
type Satisfies = TestInsert extends Record<string, unknown> ? 'yes' : 'no'

// And does it satisfy GenericTable.Insert?
type TestRow = DbUser extends Record<string, unknown> ? 'yes' : 'no'

// Try assigning
const x: Record<string, unknown> = { auth_id: 'x', email: 'x@x.com' }
const y: Omit<DbUser, 'id' | 'created_at'> = x // Does this work?
