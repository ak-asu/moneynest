import type { SVGProps } from 'react'
import type { DocumentKind, MiniGameType, SeverityLevel, PersonaType } from './database'

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number
}

export interface DocumentExplainerProps {
  document_id: string
  document_type: DocumentKind
  title: string
  summary: string
  clauses: Array<{
    label: string
    plain: string
    risk: 'low' | 'medium' | 'high'
    detail?: string
  }>
  what_ifs: Array<{ label: string; simulation_id: string }>
  voice_enabled: boolean
  language: string
}

export interface CrisisSimulatorProps {
  scenario: string
  scenario_label: string
  duration_days: number
  income_monthly: number
  fixed_expenses: Record<string, number>
  savings: number
  decision_points: Array<{
    day: number
    prompt: string
    options: Array<{ label: string; impact: number; consequence: string }>
  }>
}

export interface MiniGameProps {
  game_type: MiniGameType
  title: string
  instructions?: string
  income?: number
  categories?: Array<{ name: string; suggested: number; min: number; max: number }>
  win_condition?: string
  time_limit_seconds?: number
}

export interface InsightCardProps {
  title: string
  body: string
  severity: SeverityLevel
  actions: Array<{ label: string; detail: string }>
  voice_enabled: boolean
  language: string
}

export interface BudgetSnapshotProps {
  income_monthly: number
  expenses: Record<string, number>
  savings_rate: number
  anomalies: string[]
  coverage_gaps: string[]
}

export interface ScenarioTimelineProps {
  title: string
  events: Array<{
    date: string
    label: string
    amount: number
    type: 'income' | 'expense' | 'decision' | 'outcome'
  }>
}

export interface LearningCardProps {
  concept: string
  title: string
  explanation: string
  key_takeaway: string
  image_prompt: string
  image_url?: string
  voice_enabled: boolean
  language: string
}

export interface ActionPlanProps {
  title: string
  steps: Array<{
    label: string
    amount?: number
    deadline?: string
    detail: string
  }>
  language: string
}

export interface VoiceCardProps {
  script: string
  voice_id: string
  language: string
  emotion: 'neutral' | 'warm' | 'urgent' | 'celebratory'
  show_transcript: boolean
}

export interface ProfileSnapshotProps {
  persona: PersonaType
  health_score: number
  income_monthly: number
  gaps: Array<{ label: string; prompt: string }>
}

export interface ViewDocumentProps {
  document_id?: string
  filename?: string
  document_type?: 'insurance' | 'lease' | 'bill' | 'payslip' | 'other' | 'general'
  message?: string
}

export type GenerativeComponentName =
  | 'DocumentExplainer'
  | 'CrisisSimulator'
  | 'MiniGame'
  | 'InsightCard'
  | 'BudgetSnapshot'
  | 'ScenarioTimeline'
  | 'LearningCard'
  | 'ActionPlan'
  | 'VoiceCard'
  | 'ProfileSnapshot'
  | 'ViewDocument'
