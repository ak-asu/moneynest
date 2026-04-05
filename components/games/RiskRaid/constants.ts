import type { DefenderSpec, DefenderType } from './types'

export const LANE_COUNT = 3
export const COL_COUNT = 6
export const TICK_MS = 100

export const SUN_START = 150
export const SUN_INCREMENT = 25
export const SUN_TICK_INTERVAL = 30

export const HOUSE_HP_START = 100

export const LESSON_TICKS = 25
export const DEBRIEF_TICKS = 100
export const SPAWN_INTERVAL = 40

export const OVERSPEND_CASCADE_TICKS = 50
export const OVERSPEND_SPEED_BOOST = 1.3
export const MARKET_CRASH_HP_BOOST = 0.1

// Zombie vs defender combat
export const ZOMBIE_ATTACK_INTERVAL = 8  // ticks between zombie attacks on a blocking defender
export const ZOMBIE_ATTACK_DAMAGE: Record<1 | 2 | 3, number> = {
  1: 6,   // slow zombie: 6 HP per attack
  2: 10,  // medium
  3: 15,  // fast
}

export const SPEED_VAL: Record<1 | 2 | 3, number> = {
  1: 0.04,
  2: 0.09,
  3: 0.16,
}

export const DEFENDERS: Record<DefenderType, DefenderSpec> = {
  emergency_fund: {
    type: 'emergency_fund',
    emoji: '🏦',
    label: 'Emergency Fund',
    cost: 100,
    hp: 100,
    damage: 15,
    attackInterval: 10,
    counters: ['medical_bill', 'job_loss', 'rent_spike'],
    description: 'Absorbs all zombie types. Your financial bedrock.',
    realWorldFact: 'Experts recommend 3–6 months of expenses in an emergency fund.',
  },
  insurance_shield: {
    type: 'insurance_shield',
    emoji: '🛡️',
    label: 'Insurance Shield',
    cost: 150,
    hp: 75,
    damage: 35,
    attackInterval: 10,
    counters: ['medical_bill'],
    description: 'Destroys medical zombies fast. Risk transfer in action.',
    realWorldFact: 'Without health insurance, one ER visit averages $1,200–$2,600 out of pocket.',
  },
  budget_tracker: {
    type: 'budget_tracker',
    emoji: '📊',
    label: 'Budget Tracker',
    cost: 75,
    hp: 50,
    damage: 8,
    attackInterval: 8,
    counters: ['overspend'],
    description: 'Steady damage to spending zombies. Discipline beats big moves.',
    realWorldFact: "People who track spending save 15–20% more than those who don't.",
  },
  debt_crusher: {
    type: 'debt_crusher',
    emoji: '💥',
    label: 'Debt Crusher',
    cost: 175,
    hp: 85,
    damage: 40,
    attackInterval: 15,
    counters: ['high_interest_debt'],
    description: 'High burst damage to debt zombies. The debt avalanche method.',
    realWorldFact: 'Debt avalanche: pay highest-APR debt first — maximises interest saved.',
  },
  investment_hedge: {
    type: 'investment_hedge',
    emoji: '📈',
    label: 'Investment Hedge',
    cost: 125,
    hp: 65,
    damage: 10,
    attackInterval: 12,
    counters: ['market_crash'],
    description: 'Attacks zombies + generates passive ☀️ Sun income.',
    realWorldFact: 'A diversified portfolio loses ~50% less in a crash vs single-stock holdings.',
  },
}

export const DEFENDER_ORDER: DefenderType[] = [
  'emergency_fund',
  'insurance_shield',
  'budget_tracker',
  'debt_crusher',
  'investment_hedge',
]
