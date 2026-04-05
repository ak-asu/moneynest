export type PersonaType =
  | 'gig_worker'
  | 'student'
  | 'immigrant'
  | 'retiree'
  | 'single_parent'
  | 'other'
export type LanguageType = 'en' | 'es'
export type IncomeStreamType = 'steady' | 'irregular'
export type MessageRole = 'user' | 'assistant'
export type SavedItemType = 'game' | 'simulation' | 'document' | 'learning' | 'plan' | 'audio'
export type DocumentKind = 'insurance' | 'lease' | 'bill' | 'payslip' | 'other'
export type EntryType = 'income' | 'expense'
export type EntrySource = 'manual' | 'plaid' | 'csv'
export type ConfidenceLevel = 'low' | 'medium' | 'high'
export type SuggestionType = 'insight' | 'simulation' | 'learning' | 'plan'
export type SeverityLevel = 'low' | 'medium' | 'high'
export type MiniGameType =
  | 'drag_drop'
  | 'time_pressure'
  | 'allocation_puzzle'
  | 'tradeoff_slider'
  | 'insurance_card_game'
  | 'term_match'
  | 'fin_word'
  | 'wealth_farm'
  | 'credit_quest_game'

export interface DbUser {
  id: string
  auth_id: string
  email: string
  created_at: string
}

export interface DbProfile {
  id: string
  user_id: string
  persona: PersonaType
  language: LanguageType
  voice_id: string | null
  income_monthly: number
  income_type: IncomeStreamType
  expenses: Record<string, number>
  debts: Array<{ type: string; amount: number; rate: number }>
  goals: Array<{ label: string; target_amount: number; target_date: string }>
  savings_balance: number
  financial_health_score: number
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface DbChatSession {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface DbMessage {
  id: string
  session_id: string
  role: MessageRole
  text: string | null
  components: ComponentRecord[]
  created_at: string
}

export interface ComponentRecord {
  name: string
  props: Record<string, unknown>
}

export interface DbSavedItem {
  id: string
  user_id: string
  session_id: string | null
  type: SavedItemType
  component_name: string
  component_props: Record<string, unknown>
  profile_snapshot_hash: string | null
  title: string
  created_at: string
}

export interface DbDocument {
  id: string
  user_id: string
  filename: string
  storage_path: string
  document_type: DocumentKind
  extracted_text: string | null
  ai_explanation: DocumentExplanation | null
  created_at: string
}

export interface DocumentExplanation {
  document_type: DocumentKind
  clauses: Array<{
    label: string
    plain: string
    risk: 'low' | 'medium' | 'high'
    detail?: string
  }>
  risk_flags: string[]
  plain_summaries: string[]
  what_ifs: Array<{ label: string; simulation_id: string }>
}

export interface DbActionPlan {
  id: string
  user_id: string
  session_id: string | null
  title: string
  steps: Array<{
    label: string
    amount?: number
    deadline?: string
    detail?: string
    completed?: boolean
  }>
  completed_steps: number
  profile_snapshot_hash: string | null
  created_at: string
  updated_at: string
}

export interface DbBudgetEntry {
  id: string
  user_id: string
  category: string
  amount: number
  entry_type: EntryType
  date: string
  source: EntrySource
  created_at: string
}

export interface DbLearningProgress {
  id: string
  user_id: string
  concept: string
  exposure_count: number
  confidence_level: ConfidenceLevel
  last_seen: string | null
  updated_at: string
}

export interface DbSuggestion {
  id: string
  user_id: string
  type: SuggestionType
  title: string
  reason: string | null
  severity: SeverityLevel
  chat_seed: string | null
  expires_at: string | null
  dismissed: boolean
  created_at: string
}

export interface DbGameXp {
  id: string
  user_id: string
  game_type: string
  xp_earned: number
  reason: string | null
  created_at: string
}

export interface DbLeaderboardEntry {
  display_name: string
  total_xp: number
  rank: number
}

// Supabase Database generic type (used by createClient<Database>)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: DbUser
        Insert: Omit<DbUser, 'id' | 'created_at'>
        Update: Partial<DbUser>
        Relationships: never[]
      }
      profiles: {
        Row: DbProfile
        Insert: Omit<DbProfile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<DbProfile>
        Relationships: never[]
      }
      chat_sessions: {
        Row: DbChatSession
        Insert: Omit<DbChatSession, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<DbChatSession>
        Relationships: never[]
      }
      messages: {
        Row: DbMessage
        Insert: Omit<DbMessage, 'id' | 'created_at'>
        Update: Partial<DbMessage>
        Relationships: never[]
      }
      saved_items: {
        Row: DbSavedItem
        Insert: Omit<DbSavedItem, 'id' | 'created_at'>
        Update: Partial<DbSavedItem>
        Relationships: never[]
      }
      documents: {
        Row: DbDocument
        Insert: Omit<DbDocument, 'id' | 'created_at'>
        Update: Partial<DbDocument>
        Relationships: never[]
      }
      action_plans: {
        Row: DbActionPlan
        Insert: Omit<DbActionPlan, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<DbActionPlan>
        Relationships: never[]
      }
      budget_entries: {
        Row: DbBudgetEntry
        Insert: Omit<DbBudgetEntry, 'id' | 'created_at'>
        Update: Partial<DbBudgetEntry>
        Relationships: never[]
      }
      plaid_connections: {
        Row: {
          id: string
          user_id: string
          access_token: string
          item_id: string
          institution_name: string | null
          last_synced: string | null
        }
        Insert: any
        Update: any
        Relationships: never[]
      }
      learning_progress: {
        Row: DbLearningProgress
        Insert: Omit<DbLearningProgress, 'id' | 'updated_at'>
        Update: Partial<DbLearningProgress>
        Relationships: never[]
      }
      suggestions: {
        Row: DbSuggestion
        Insert: Omit<DbSuggestion, 'id' | 'created_at'>
        Update: Partial<DbSuggestion>
        Relationships: never[]
      }
      game_xp: {
        Row: DbGameXp
        Insert: Omit<DbGameXp, 'id' | 'created_at'>
        Update: Partial<DbGameXp>
        Relationships: never[]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
