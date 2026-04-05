'use client'
import { useEffect } from 'react'
import { Button } from '@heroui/react'
import { useLlmConfig } from './use-llm-config'
import { useGameEngine } from './use-game-engine'
import { DEFENDERS, DEFENDER_ORDER, HOUSE_HP_START, COL_COUNT, LANE_COUNT } from './constants'
import type { GameConfig, GameState, DefenderType, DefenderInstance, ZombieInstance } from './types'
import styles from './riskraid.module.css'

// ─── Exported component ──────────────────────────────────────────────────────

export function RiskRaid({ onComplete }: { onComplete?: (summary: string) => void }) {
  const { config, loading, error } = useLlmConfig()

  if (loading) return <LoadingScreen error={null} />
  if (error || !config) return <LoadingScreen error={error ?? 'Could not load game config.'} />

  return <RiskRaidGame config={config} onComplete={onComplete} />
}

// ─── Game orchestrator ───────────────────────────────────────────────────────

function RiskRaidGame({
  config,
  onComplete,
}: {
  config: GameConfig
  onComplete?: (summary: string) => void
}) {
  const { state, selectDefender, dismissInfoCard, placeDefender, advanceFromDebrief, restartGame } =
    useGameEngine(config)

  useEffect(() => {
    if (state.phase === 'end' && onComplete) {
      const hpLost = HOUSE_HP_START - state.houseHp
      const grade =
        hpLost <= 0
          ? 'A'
          : hpLost <= 20
            ? 'A'
            : hpLost <= 40
              ? 'B'
              : hpLost <= 60
                ? 'C'
                : hpLost <= 80
                  ? 'D'
                  : 'F'
      onComplete(
        `RiskRaid complete — Grade: ${grade}. ${config.risk_label} (score: ${config.risk_score}/100). Key insight: ${config.insights[0]}`
      )
    }
  }, [state.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.phase === 'wave_debrief') {
    const waveConf = state.waveIndex === 0 ? config.wave1 : config.wave2
    return (
      <WaveDebrief
        concept={waveConf.debrief_concept}
        explanation={waveConf.debrief_explanation}
        waveNumber={state.waveIndex + 1}
        onContinue={advanceFromDebrief}
      />
    )
  }

  if (state.phase === 'end') {
    return <EndScreen state={state} config={config} onRestart={restartGame} />
  }

  return (
    <div
      className="flex flex-col gap-2 w-full select-none"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      <HUD
        sun={state.sun}
        houseHp={state.houseHp}
        waveIndex={state.waveIndex}
        riskLabel={config.risk_label}
        mockContext={config.mock_context}
      />
      <Board state={state} onCellClick={placeDefender} />
      {state.lessonPopup && (
        <LessonPopup
          emoji={state.lessonPopup.emoji}
          label={state.lessonPopup.label}
          text={state.lessonPopup.text}
        />
      )}
      {state.infoCardDefender && (
        <InfoCard type={state.infoCardDefender} onDismiss={dismissInfoCard} />
      )}
      <DefenderTray sun={state.sun} selected={state.selectedDefender} onSelect={selectDefender} />
    </div>
  )
}

// ─── LoadingScreen ───────────────────────────────────────────────────────────

function LoadingScreen({ error }: { error: string | null }) {
  return (
    <div
      className="clay-card flex flex-col items-center justify-center gap-4 p-8 min-h-[260px] text-center w-full"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      {error ? (
        <>
          <span className="text-4xl">⚠️</span>
          <p className="text-sm font-semibold" style={{ color: 'var(--clay-danger)' }}>
            {error}
          </p>
        </>
      ) : (
        <>
          <span className="text-4xl">🛡️</span>
          <p className="font-bold" style={{ color: 'var(--clay-text)' }}>
            Analyzing your risk profile
          </p>
          <div className="flex gap-1.5 items-center">
            <span
              className={`w-2 h-2 rounded-full ${styles.dot1}`}
              style={{ backgroundColor: 'var(--clay-accent)' }}
            />
            <span
              className={`w-2 h-2 rounded-full ${styles.dot2}`}
              style={{ backgroundColor: 'var(--clay-accent)' }}
            />
            <span
              className={`w-2 h-2 rounded-full ${styles.dot3}`}
              style={{ backgroundColor: 'var(--clay-accent)' }}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--clay-text-soft)' }}>
            Building your personalized zombie wave…
          </p>
        </>
      )}
    </div>
  )
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function HUD({
  sun,
  houseHp,
  waveIndex,
  riskLabel,
  mockContext,
}: {
  sun: number
  houseHp: number
  waveIndex: number
  riskLabel: string
  mockContext: string[]
}) {
  const hpPct = (houseHp / HOUSE_HP_START) * 100
  const hpColor =
    hpPct > 60 ? 'var(--clay-success)' : hpPct > 30 ? 'var(--clay-warning)' : 'var(--clay-danger)'

  return (
    <div className="clay-card p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span>☀️ {sun}</span>
          <span style={{ color: 'var(--clay-text-soft)' }}>·</span>
          <span>❤️ {houseHp}</span>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: 'var(--clay-surface-tint)',
            color: 'var(--clay-accent)',
          }}
        >
          Wave {waveIndex + 1} / 2
        </span>
        <span className="text-xs" style={{ color: 'var(--clay-text-soft)' }}>
          {riskLabel}
        </span>
      </div>

      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--clay-surface-tint)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${hpPct}%`, backgroundColor: hpColor }}
        />
      </div>

      {mockContext[0] && (
        <p className="text-xs italic" style={{ color: 'var(--clay-text-soft)' }}>
          {mockContext[0]}
        </p>
      )}
    </div>
  )
}

// ─── Board ────────────────────────────────────────────────────────────────────

function Board({
  state,
  onCellClick,
}: {
  state: GameState
  onCellClick: (lane: number, col: number) => void
}) {
  return (
    <div className="clay-card overflow-hidden p-2 flex flex-col gap-1">
      {Array.from({ length: LANE_COUNT }, (_, lane) => (
        <Lane
          key={lane}
          laneIndex={lane}
          cells={state.cells[lane]}
          zombies={state.zombies.filter((z) => z.laneIndex === lane && !z.isDefeated)}
          selectedDefender={state.selectedDefender}
          onCellClick={(col) => onCellClick(lane, col)}
        />
      ))}
    </div>
  )
}

function Lane({
  laneIndex,
  cells,
  zombies,
  selectedDefender,
  onCellClick,
}: {
  laneIndex: number
  cells: (DefenderInstance | null)[]
  zombies: ZombieInstance[]
  selectedDefender: DefenderType | null
  onCellClick: (col: number) => void
}) {
  // Lane has (COL_COUNT + 1) visual slots: 1 house + COL_COUNT cells
  // Zombie x: COL_COUNT+0.5 (entering right) → 0 (at house edge)
  // Left% = (z.x + 1) / (COL_COUNT + 1) * 100
  const slotPct = 100 / (COL_COUNT + 1)

  return (
    <div
      className="relative flex rounded-xl overflow-hidden"
      style={{ minHeight: '72px', borderBottom: '1px solid var(--clay-border)' }}
    >
      {/* House */}
      <div
        className="flex items-center justify-center text-2xl shrink-0"
        style={{
          width: `${slotPct}%`,
          backgroundColor: 'var(--clay-surface-tint)',
          borderRight: '1px solid var(--clay-border)',
        }}
        aria-label="Your financial house"
      >
        🏠
      </div>

      {/* Defender cells */}
      {cells.map((defender, col) => (
        <button
          key={col}
          type="button"
          onClick={() => onCellClick(col)}
          className="relative flex flex-col items-center justify-center transition-colors duration-150"
          style={{
            width: `${slotPct}%`,
            backgroundColor:
              selectedDefender && !defender
                ? 'color-mix(in srgb, var(--clay-accent) 8%, var(--clay-surface-tint))'
                : 'var(--clay-surface)',
            borderRight: '1px solid var(--clay-border)',
            cursor: selectedDefender && !defender ? 'pointer' : 'default',
          }}
          aria-label={
            defender
              ? `${defender.label} HP ${defender.hp}/${defender.maxHp}`
              : `Place defender lane ${laneIndex + 1} col ${col + 1}`
          }
        >
          {defender ? (
            <>
              <span className="text-2xl">{defender.emoji}</span>
              {/* HP bar */}
              <div
                className="absolute bottom-1 left-1 right-1 h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--clay-border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${(defender.hp / defender.maxHp) * 100}%`,
                    backgroundColor:
                      defender.hp / defender.maxHp > 0.5
                        ? 'var(--clay-success)'
                        : defender.hp / defender.maxHp > 0.25
                          ? 'var(--clay-warning)'
                          : 'var(--clay-danger)',
                  }}
                />
              </div>
            </>
          ) : selectedDefender ? (
            <span className="text-base opacity-25">＋</span>
          ) : null}
        </button>
      ))}

      {/* Zombies — absolutely positioned */}
      {zombies.map((z) => (
        <div
          key={z.instanceId}
          className={`absolute top-0 bottom-0 flex items-center justify-center text-2xl pointer-events-none z-10 ${styles.zombieMarch}`}
          style={{
            left: `${((z.x + 1) / (COL_COUNT + 1)) * 100}%`,
            transform: 'translateX(-50%)',
          }}
          title={`${z.spec.label} — HP: ${Math.max(0, z.currentHp)}`}
        >
          {z.spec.emoji}
        </div>
      ))}
    </div>
  )
}

// ─── LessonPopup ─────────────────────────────────────────────────────────────

function LessonPopup({ emoji, label, text }: { emoji: string; label: string; text: string }) {
  return (
    <div className={`clay-card-danger p-3 flex gap-3 items-start ${styles.lessonSlide}`}>
      <span className="text-2xl shrink-0">{emoji}</span>
      <div>
        <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--clay-danger)' }}>
          {label} broke through!
        </p>
        <p className="text-xs leading-snug" style={{ color: 'var(--clay-text)' }}>
          {text}
        </p>
      </div>
    </div>
  )
}

// ─── InfoCard ────────────────────────────────────────────────────────────────

function InfoCard({ type, onDismiss }: { type: DefenderType; onDismiss: () => void }) {
  const spec = DEFENDERS[type]
  return (
    <div className={`clay-card-success p-3 flex gap-3 items-start ${styles.lessonSlide}`}>
      <span className="text-2xl shrink-0">{spec.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--clay-success)' }}>
          {spec.label}
        </p>
        <p className="text-xs leading-snug" style={{ color: 'var(--clay-text)' }}>
          {spec.description}
        </p>
        <p className="text-xs mt-1 italic" style={{ color: 'var(--clay-text-soft)' }}>
          {spec.realWorldFact}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-xs shrink-0 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--clay-text-soft)' }}
        aria-label="Dismiss info"
      >
        ✕
      </button>
    </div>
  )
}

// ─── DefenderTray ─────────────────────────────────────────────────────────────

function DefenderTray({
  sun,
  selected,
  onSelect,
}: {
  sun: number
  selected: DefenderType | null
  onSelect: (type: DefenderType) => void
}) {
  return (
    <div className="clay-card p-2 flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap justify-center">
        {DEFENDER_ORDER.map((type) => {
          const spec = DEFENDERS[type]
          const canAfford = sun >= spec.cost
          const isSelected = selected === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => canAfford && onSelect(type)}
              disabled={!canAfford}
              aria-pressed={isSelected}
              aria-label={`${spec.label} — costs ${spec.cost} sun`}
              className="clay-btn flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-150"
              style={{
                outline: isSelected ? '2px solid var(--clay-accent)' : 'none',
                backgroundColor: isSelected
                  ? 'color-mix(in srgb, var(--clay-accent) 12%, var(--clay-surface))'
                  : undefined,
                opacity: canAfford ? 1 : 0.4,
                cursor: canAfford ? 'pointer' : 'not-allowed',
                minWidth: '64px',
              }}
            >
              <span className="text-xl">{spec.emoji}</span>
              <span
                className="text-xs font-bold leading-tight text-center"
                style={{ color: 'var(--clay-text)' }}
              >
                {spec.label}
              </span>
              <span className="text-xs" style={{ color: 'var(--clay-text-soft)' }}>
                ☀️{spec.cost}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-center text-xs" style={{ color: 'var(--clay-text-soft)' }}>
        Select a defender, then click a lane cell to place it
      </p>
    </div>
  )
}

// ─── WaveDebrief ─────────────────────────────────────────────────────────────

function WaveDebrief({
  concept,
  explanation,
  waveNumber,
  onContinue,
}: {
  concept: string
  explanation: string
  waveNumber: number
  onContinue: () => void
}) {
  return (
    <div
      className="clay-card flex flex-col items-center gap-4 p-6 text-center w-full"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      <span className="text-4xl">📖</span>
      <div>
        <p
          className="text-xs font-bold uppercase tracking-wide mb-1"
          style={{ color: 'var(--clay-accent)' }}
        >
          Wave {waveNumber} Complete · Key Concept
        </p>
        <p className="text-base font-bold mb-2" style={{ color: 'var(--clay-text)' }}>
          {concept}
        </p>
        <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--clay-text-soft)' }}>
          {explanation}
        </p>
      </div>
      <Button onPress={onContinue} variant="primary" className="clay-btn mt-2" size="sm">
        Continue to Wave {waveNumber + 1} →
      </Button>
    </div>
  )
}

// ─── EndScreen ────────────────────────────────────────────────────────────────

const GRADE_COLOR: Record<string, string> = {
  A: 'var(--clay-success)',
  B: 'var(--clay-success)',
  C: 'var(--clay-warning)',
  D: 'var(--clay-warning)',
  F: 'var(--clay-danger)',
}

function EndScreen({
  state,
  config,
  onRestart,
}: {
  state: GameState
  config: GameConfig
  onRestart: () => void
}) {
  const hpLost = HOUSE_HP_START - state.houseHp
  const grade =
    hpLost <= 0
      ? 'A'
      : hpLost <= 20
        ? 'A'
        : hpLost <= 40
          ? 'B'
          : hpLost <= 60
            ? 'C'
            : hpLost <= 80
              ? 'D'
              : 'F'

  return (
    <div className="flex flex-col gap-3 w-full" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Grade */}
      <div className="clay-card p-5 flex flex-col items-center gap-2 text-center">
        <div
          className={`text-6xl font-black ${styles.gradePop}`}
          style={{ color: GRADE_COLOR[grade] }}
        >
          {grade}
        </div>
        <p className="text-sm font-bold" style={{ color: 'var(--clay-text)' }}>
          {config.risk_label}
        </p>
        <p className="text-xs" style={{ color: 'var(--clay-text-soft)' }}>
          Risk score: {config.risk_score}/100 · HP remaining: {state.houseHp}/{HOUSE_HP_START}
        </p>
      </div>

      {/* Financial story */}
      <div className="clay-card p-4">
        <p
          className="text-xs font-bold uppercase tracking-wide mb-1"
          style={{ color: 'var(--clay-accent)' }}
        >
          Your Financial Story
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--clay-text)' }}>
          {config.financial_story}
        </p>
      </div>

      {/* Insights */}
      <div className="clay-card p-4 flex flex-col gap-2">
        <p
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: 'var(--clay-accent)' }}
        >
          Personalized Insights
        </p>
        {config.insights.map((insight, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-sm shrink-0">💡</span>
            <p className="text-xs leading-snug" style={{ color: 'var(--clay-text)' }}>
              {insight}
            </p>
          </div>
        ))}
      </div>

      {/* Breakthrough log */}
      {state.breakthroughLog.length > 0 && (
        <div className="clay-card-danger p-4 flex flex-col gap-2">
          <p
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: 'var(--clay-danger)' }}
          >
            What Broke Through
          </p>
          {state.breakthroughLog.map((entry, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-sm shrink-0">{entry.zombieEmoji}</span>
              <p className="text-xs leading-snug" style={{ color: 'var(--clay-text)' }}>
                {entry.lesson}
              </p>
            </div>
          ))}
        </div>
      )}

      <Button onPress={onRestart} variant="ghost" className="clay-btn w-full" size="sm">
        🔁 Play Again
      </Button>
    </div>
  )
}
