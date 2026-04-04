import type { Database } from './types/database'

// Import the exact GenericSchema type from supabase
type GenericRelationship = {
  foreignKeyName: string
  columns: string[]
  referencedRelation: string
  referencedColumns: string[]
}
type GenericTable = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: GenericRelationship[]
}
type GenericUpdatableView = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: GenericRelationship[]
}
type GenericNonUpdatableView = {
  Row: Record<string, unknown>
  Relationships: GenericRelationship[]
}
type GenericView = GenericUpdatableView | GenericNonUpdatableView
type GenericFunction = {
  Args: Record<string, unknown> | never
  Returns: unknown
  SetofOptions?: unknown
}
type GenericSchema = {
  Tables: Record<string, GenericTable>
  Views: Record<string, GenericView>
  Functions: Record<string, GenericFunction>
}

type Pub = Database['public']
type PubSatisfies = Pub extends GenericSchema ? 'yes' : 'no'
// Let's check each component
type TablesSatisfies = Pub['Tables'] extends Record<string, GenericTable> ? 'yes' : 'no'
type ViewsSatisfies = Pub['Views'] extends Record<string, GenericView> ? 'yes' : 'no'
type FunctionsSatisfies = Pub['Functions'] extends Record<string, GenericFunction> ? 'yes' : 'no'
