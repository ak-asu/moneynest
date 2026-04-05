export type ZombieId =
  | 'medical_bill'
  | 'job_loss'
  | 'overspend'
  | 'high_interest_debt'
  | 'rent_spike'
  | 'market_crash'

export type DefenderType =
  | 'emergency_fund'
  | 'insurance_shield'
  | 'budget_tracker'
  | 'debt_crusher'
  | 'investment_hedge'

export type GamePhase = 'loading' | 'playing' | 'wave_debrief' | 'end'

// --- LLM-generated config ---

export interface ZombieSpec {
  id: ZombieId
  emoji: string
  label: string
  hp: number
  speed: 1 | 2 | 3
  damage: number
  lesson: string
  cascades_to?: ZombieId
}

export interface WaveConfig {
  zombies: ZombieSpec[]
  debrief_concept: string
  debrief_explanation: string
}

export interface GameConfig {
  risk_score: number
  risk_label: string
  mock_context: string[]
  wave1: WaveConfig
  wave2: WaveConfig
  insights: string[]
  financial_story: string
}

// --- Runtime game state ---

export interface DefenderSpec {
  type: DefenderType
  emoji: string
  label: string
  cost: number
  hp: number
  damage: number
  attackInterval: number
  counters: ZombieId[]
  description: string
  realWorldFact: string
}

export interface DefenderInstance {
  type: DefenderType
  emoji: string
  label: string
  hp: number
  maxHp: number
  damage: number
  attackInterval: number
  attackCooldown: number
  counters: ZombieId[]
}

export interface ZombieInstance {
  instanceId: string
  spec: ZombieSpec
  laneIndex: number
  x: number
  currentHp: number
  aliveFor: number
  isDefeated: boolean
  blockedByCol: number | null    // col index of the defender blocking this zombie
  zombieAttackCooldown: number   // ticks until next attack on the blocking defender
}

export interface BreakthroughEntry {
  zombieLabel: string
  zombieEmoji: string
  lesson: string
}

export interface PendingZombie extends ZombieSpec {
  targetLane: number
}

export interface GameState {
  phase: GamePhase
  config: GameConfig
  sun: number
  houseHp: number
  waveIndex: number
  cells: (DefenderInstance | null)[][]
  zombies: ZombieInstance[]
  pendingZombies: PendingZombie[]
  selectedDefender: DefenderType | null
  infoCardDefender: DefenderType | null
  lessonPopup: { text: string; emoji: string; label: string } | null
  lessonTick: number
  debriefTick: number
  sunTick: number
  spawnTick: number
  breakthroughLog: BreakthroughEntry[]
  zombieCounter: number
  marketCrashActive: boolean
}
