'use client'
import { useState, useEffect, useCallback } from 'react'
import type {
  GameConfig,
  GamePhase,
  GameState,
  DefenderType,
  DefenderInstance,
  ZombieInstance,
  ZombieSpec,
  ZombieId,
  PendingZombie,
} from './types'
import {
  LANE_COUNT,
  COL_COUNT,
  TICK_MS,
  SUN_START,
  SUN_INCREMENT,
  SUN_TICK_INTERVAL,
  HOUSE_HP_START,
  LESSON_TICKS,
  DEBRIEF_TICKS,
  SPAWN_INTERVAL,
  OVERSPEND_CASCADE_TICKS,
  OVERSPEND_SPEED_BOOST,
  MARKET_CRASH_HP_BOOST,
  SPEED_VAL,
  DEFENDERS,
  ZOMBIE_ATTACK_INTERVAL,
  ZOMBIE_ATTACK_DAMAGE,
} from './constants'

// ─── State factory ────────────────────────────────────────────────────────────

function makeCells(): (DefenderInstance | null)[][] {
  return Array.from({ length: LANE_COUNT }, () =>
    Array<DefenderInstance | null>(COL_COUNT).fill(null)
  )
}

function assignLanes(zombies: ZombieSpec[]): PendingZombie[] {
  return zombies.map(z => ({ ...z, targetLane: Math.floor(Math.random() * LANE_COUNT) }))
}

function makeInitialState(config: GameConfig): GameState {
  return {
    phase: 'playing',
    config,
    sun: SUN_START,
    houseHp: HOUSE_HP_START,
    waveIndex: 0,
    cells: makeCells(),
    zombies: [],
    pendingZombies: assignLanes(config.wave1.zombies),
    selectedDefender: null,
    infoCardDefender: null,
    lessonPopup: null,
    lessonTick: 0,
    debriefTick: 0,
    sunTick: 0,
    spawnTick: 0,
    breakthroughLog: [],
    zombieCounter: 0,
    marketCrashActive: false,
  }
}

// ─── Pure tick function ───────────────────────────────────────────────────────

export function tick(prev: GameState): GameState {
  if (prev.phase !== 'playing') return prev

  // 1. Sun tick
  const sunTick = prev.sunTick + 1
  const resetSunTick = sunTick >= SUN_TICK_INTERVAL
  let sun = prev.sun
  if (resetSunTick) {
    sun += SUN_INCREMENT
    const hedgeCount = prev.cells.flat().filter(c => c?.type === 'investment_hedge').length
    sun += hedgeCount * SUN_INCREMENT
  }

  // 2. Lesson popup countdown
  const newLessonTick = prev.lessonTick > 0 ? prev.lessonTick - 1 : 0
  const lessonPopup = newLessonTick > 0 ? prev.lessonPopup : null

  // 3. Zombie spawning
  let { pendingZombies, zombieCounter, marketCrashActive } = prev
  let zombies = prev.zombies
  let spawnTick = prev.spawnTick + 1

  if (spawnTick >= SPAWN_INTERVAL && pendingZombies.length > 0) {
    const [toSpawn, ...remaining] = pendingZombies
    pendingZombies = remaining
    spawnTick = 0

    if (toSpawn.id === 'market_crash') {
      marketCrashActive = true
      zombies = zombies.map(z => ({
        ...z,
        currentHp: Math.min(
          z.currentHp + Math.floor(z.spec.hp * MARKET_CRASH_HP_BOOST),
          Math.floor(z.spec.hp * (1 + MARKET_CRASH_HP_BOOST))
        ),
      }))
    }

    const newZombie: ZombieInstance = {
      instanceId: `z${zombieCounter}`,
      spec: toSpawn,
      laneIndex: toSpawn.targetLane,
      x: COL_COUNT + 0.5,
      currentHp: toSpawn.hp,
      aliveFor: 0,
      isDefeated: false,
      blockedByCol: null,
      zombieAttackCooldown: 0,
    }
    zombies = [...zombies, newZombie]
    zombieCounter++
  }

  // 4. Move zombies (only those not currently blocked)
  const overspendCascadeActive = zombies.some(
    z => !z.isDefeated && z.spec.id === 'overspend' && z.aliveFor >= OVERSPEND_CASCADE_TICKS
  )

  zombies = zombies.map(z => {
    if (z.isDefeated) return z
    // Blocked zombies don't move — they attack their defender instead
    if (z.blockedByCol !== null) return { ...z, aliveFor: z.aliveFor + 1 }
    const baseSpeed = SPEED_VAL[z.spec.speed]
    const boost =
      overspendCascadeActive && z.spec.id === 'high_interest_debt' ? OVERSPEND_SPEED_BOOST : 1
    return { ...z, x: z.x - baseSpeed * boost, aliveFor: z.aliveFor + 1 }
  })

  // 4a. Create mutable cell copy for this tick (used by both zombie and defender attacks)
  const newCells = prev.cells.map(row => row.map(cell => (cell ? { ...cell } : null)))

  // 4b. Detect blocking: find the rightmost defender each zombie has reached, clamp & block
  zombies = zombies.map(z => {
    if (z.isDefeated) return z

    // Find highest col where a defender exists AND the zombie has entered its right side
    let blockingCol: number | null = null
    for (let c = COL_COUNT - 1; c >= 0; c--) {
      if (newCells[z.laneIndex][c] !== null && z.x <= c + 0.5) {
        blockingCol = c
        break  // highest col wins (first encountered from the right)
      }
    }

    if (blockingCol !== null) {
      return { ...z, x: blockingCol + 0.5, blockedByCol: blockingCol }
    }
    // No blocking defender — zombie moves freely, reset block state
    return { ...z, blockedByCol: null }
  })

  // 4c. Blocked zombies attack their blocking defender
  zombies = zombies.map(z => {
    if (z.isDefeated || z.blockedByCol === null) return z

    const col = z.blockedByCol
    const defender = newCells[z.laneIndex][col]

    if (!defender) {
      // Defender already gone (destroyed by another zombie this tick)
      return { ...z, blockedByCol: null, zombieAttackCooldown: 0 }
    }

    if (z.zombieAttackCooldown > 0) {
      return { ...z, zombieAttackCooldown: z.zombieAttackCooldown - 1 }
    }

    // Attack the defender
    const dmg = ZOMBIE_ATTACK_DAMAGE[z.spec.speed]
    const newHp = defender.hp - dmg
    if (newHp <= 0) {
      newCells[z.laneIndex][col] = null  // defender destroyed — zombie unblocked next move
      return { ...z, blockedByCol: null, zombieAttackCooldown: 0 }
    }
    newCells[z.laneIndex][col] = { ...defender, hp: newHp }
    return { ...z, zombieAttackCooldown: ZOMBIE_ATTACK_INTERVAL }
  })

  // 5. Defender attacks zombies (all zombies in range, blocked or not)
  const damageMap = new Map<string, number>()

  for (let lane = 0; lane < LANE_COUNT; lane++) {
    for (let col = 0; col < COL_COUNT; col++) {
      const defender = newCells[lane][col]
      if (!defender) continue

      // Target: nearest non-defeated zombie in this lane at or to the right of this column
      const target = zombies
        .filter(z => !z.isDefeated && z.laneIndex === lane && z.x >= col - 0.5)
        .sort((a, b) => a.x - b.x)[0]

      if (!target) continue

      if (defender.attackCooldown > 0) {
        newCells[lane][col] = { ...defender, attackCooldown: defender.attackCooldown - 1 }
      } else {
        const isCounter = defender.counters.includes(target.spec.id as ZombieId)
        const dmg = isCounter ? Math.floor(defender.damage * 1.5) : defender.damage
        damageMap.set(target.instanceId, (damageMap.get(target.instanceId) ?? 0) + dmg)
        newCells[lane][col] = { ...defender, attackCooldown: defender.attackInterval }
      }
    }
  }

  zombies = zombies.map(z => {
    const dmg = damageMap.get(z.instanceId) ?? 0
    if (dmg === 0) return z
    const newHp = z.currentHp - dmg
    return { ...z, currentHp: newHp, isDefeated: newHp <= 0 }
  })

  // 6. Breakthroughs
  let houseHp = prev.houseHp
  let activeLessonPopup = lessonPopup
  let activeLessonTick = newLessonTick
  let breakthroughLog = prev.breakthroughLog
  const cascadeQueue: PendingZombie[] = []

  zombies = zombies.map(z => {
    if (z.isDefeated || z.x > 0) return z

    houseHp = Math.max(0, houseHp - z.spec.damage)
    activeLessonPopup = { text: z.spec.lesson, emoji: z.spec.emoji, label: z.spec.label }
    activeLessonTick = LESSON_TICKS
    breakthroughLog = [
      ...breakthroughLog,
      { zombieLabel: z.spec.label, zombieEmoji: z.spec.emoji, lesson: z.spec.lesson },
    ]

    if (z.spec.cascades_to) {
      const allSpecs = [...prev.config.wave1.zombies, ...prev.config.wave2.zombies]
      const cascadeSpec = allSpecs.find(s => s.id === z.spec.cascades_to)
      if (cascadeSpec) {
        cascadeQueue.push({
          ...cascadeSpec,
          hp: Math.floor(cascadeSpec.hp * 0.65),
          targetLane: z.laneIndex,
        })
      }
    }

    return { ...z, isDefeated: true }
  })

  pendingZombies = [...pendingZombies, ...cascadeQueue]

  // 7. House HP = 0 → game over
  if (houseHp <= 0) {
    return {
      ...prev,
      phase: 'end',
      houseHp: 0,
      sun,
      sunTick: resetSunTick ? 0 : sunTick,
      zombies,
      cells: newCells,
      pendingZombies,
      zombieCounter,
      marketCrashActive,
      breakthroughLog,
      lessonPopup: activeLessonPopup,
      lessonTick: activeLessonTick,
      spawnTick,
    }
  }

  // 8. Wave clear check
  const activeZombies = zombies.filter(z => !z.isDefeated)
  const waveClear = pendingZombies.length === 0 && activeZombies.length === 0

  if (waveClear) {
    const nextPhase: GamePhase = prev.waveIndex >= 1 ? 'end' : 'wave_debrief'
    return {
      ...prev,
      phase: nextPhase,
      sun,
      sunTick: resetSunTick ? 0 : sunTick,
      houseHp,
      zombies,
      cells: newCells,
      pendingZombies,
      zombieCounter,
      marketCrashActive,
      breakthroughLog,
      lessonPopup: activeLessonPopup,
      lessonTick: activeLessonTick,
      debriefTick: nextPhase === 'wave_debrief' ? DEBRIEF_TICKS : 0,
      spawnTick,
    }
  }

  return {
    ...prev,
    sun,
    sunTick: resetSunTick ? 0 : sunTick,
    houseHp,
    zombies,
    cells: newCells,
    pendingZombies,
    zombieCounter,
    marketCrashActive,
    breakthroughLog,
    lessonPopup: activeLessonPopup,
    lessonTick: activeLessonTick,
    spawnTick,
  }
}

// ─── React hook ───────────────────────────────────────────────────────────────

export function useGameEngine(config: GameConfig) {
  const [state, setState] = useState<GameState>(() => makeInitialState(config))

  useEffect(() => {
    if (state.phase !== 'playing') return
    const interval = setInterval(() => setState(tick), TICK_MS)
    return () => clearInterval(interval)
  }, [state.phase])

  const advanceFromDebrief = useCallback(() => {
    setState(prev => {
      if (prev.phase !== 'wave_debrief') return prev
      const nextWave = prev.waveIndex + 1
      if (nextWave > 1) return { ...prev, phase: 'end' }
      return {
        ...prev,
        phase: 'playing',
        waveIndex: nextWave,
        zombies: [],
        pendingZombies: assignLanes(prev.config.wave2.zombies),
        spawnTick: 0,
        lessonPopup: null,
        lessonTick: 0,
      }
    })
  }, [])

  useEffect(() => {
    if (state.phase !== 'wave_debrief') return
    const timer = setTimeout(advanceFromDebrief, DEBRIEF_TICKS * TICK_MS)
    return () => clearTimeout(timer)
  }, [state.phase, advanceFromDebrief])

  const selectDefender = useCallback((type: DefenderType) => {
    setState(prev => ({
      ...prev,
      selectedDefender: prev.selectedDefender === type ? null : type,
      infoCardDefender: prev.selectedDefender === type ? null : type,
    }))
  }, [])

  const dismissInfoCard = useCallback(() => {
    setState(prev => ({ ...prev, infoCardDefender: null }))
  }, [])

  const placeDefender = useCallback((laneIndex: number, colIndex: number) => {
    setState(prev => {
      if (!prev.selectedDefender) return prev
      if (prev.cells[laneIndex][colIndex] !== null) return prev
      const spec = DEFENDERS[prev.selectedDefender]
      if (prev.sun < spec.cost) return prev

      const newCells = prev.cells.map(row => [...row])
      const defender: DefenderInstance = {
        type: spec.type,
        emoji: spec.emoji,
        label: spec.label,
        hp: spec.hp,
        maxHp: spec.hp,
        damage: spec.damage,
        attackInterval: spec.attackInterval,
        attackCooldown: 0,
        counters: spec.counters,
      }
      newCells[laneIndex][colIndex] = defender

      return {
        ...prev,
        sun: prev.sun - spec.cost,
        cells: newCells,
        selectedDefender: null,
        infoCardDefender: null,
      }
    })
  }, [])

  const restartGame = useCallback(() => {
    setState(makeInitialState(config))
  }, [config])

  return { state, selectDefender, dismissInfoCard, placeDefender, advanceFromDebrief, restartGame }
}
