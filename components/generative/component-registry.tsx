import { VoiceCard } from './voice-card'
import { DocumentExplainer } from './document-explainer'
import { CrisisSimulator } from './crisis-simulator'
import { MiniGame } from './mini-game'
import { InsightCard } from './insight-card'
import { BudgetSnapshot } from './budget-snapshot'
import { ScenarioTimeline } from './scenario-timeline'
import { LearningCard } from './learning-card'
import { ActionPlan } from './action-plan'
import { ProfileSnapshot } from './profile-snapshot'
import type { ComponentType } from 'react'

export const COMPONENT_REGISTRY: Record<string, ComponentType<any>> = {
  voice_card: VoiceCard,
  document_explainer: DocumentExplainer,
  crisis_simulator: CrisisSimulator,
  mini_game: MiniGame,
  insight_card: InsightCard,
  budget_snapshot: BudgetSnapshot,
  scenario_timeline: ScenarioTimeline,
  learning_card: LearningCard,
  action_plan: ActionPlan,
  profile_snapshot: ProfileSnapshot,
}
