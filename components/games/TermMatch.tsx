'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Nunito } from 'next/font/google'
import { cn } from '@/lib/utils/cn'
import { useVoice } from '@/lib/hooks/useVoice'
import styles from './termmatch.module.css'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700', '800', '900'] })

const ROUNDS = [
  {
    label: 'Round 1 · Money basics', color: '#CC0000',
    pairs: [
      { term: 'INCOME',   def: 'Money you earn — from a job, gig work, or selling something' },
      { term: 'EXPENSE',  def: 'Money you spend — rent, food, subscriptions, anything you buy' },
      { term: 'SAVINGS',  def: 'Money you keep instead of spending — your future self will thank you' },
      { term: 'BUDGET',   def: 'A plan for your money before you spend it — not a punishment' },
      { term: 'DEBT',     def: 'Money you owe to someone else — it grows if you ignore it' },
      { term: 'INTEREST', def: 'Extra money you pay for borrowing, or earn for saving' },
    ],
  },
  {
    label: 'Round 2 · Banking & credit', color: '#2563eb',
    pairs: [
      { term: 'CREDIT SCORE',      def: 'A number from 300–850 that shows lenders how trustworthy you are with money' },
      { term: 'DEBIT CARD',        def: 'A card that spends money you already have — not borrowed' },
      { term: 'APR',               def: 'The yearly cost of borrowing money — the higher it is, the more you pay back' },
      { term: 'OVERDRAFT',         def: 'Spending more than you have — your bank covers it, then charges you for it' },
      { term: 'COMPOUND INTEREST', def: 'Earning interest on your interest — how $1,000 quietly becomes $2,000 over time' },
      { term: 'MINIMUM PAYMENT',   def: 'The smallest amount you can pay on a credit card — but you\'ll owe more next month' },
    ],
  },
  {
    label: 'Round 3 · Insurance', color: '#7c3aed',
    pairs: [
      { term: 'PREMIUM',      def: 'The monthly amount you pay to keep insurance — like a subscription for protection' },
      { term: 'DEDUCTIBLE',   def: 'What you pay first before insurance covers the rest — like an entry fee for a claim' },
      { term: 'CLAIM',        def: 'A formal request to your insurer after something goes wrong — how you access your coverage' },
      { term: 'COVERAGE',     def: 'What your policy actually protects — know what\'s in before you need it' },
      { term: 'BENEFICIARY',  def: 'The person who receives the payout from a life insurance policy' },
      { term: 'UNDERWRITING', def: 'How insurers decide what to charge you — based on your personal risk level' },
    ],
  },
]

type CardState = 'normal' | 'selected' | 'matched' | 'wrong' | 'failed'
type Phase = 'instructions' | 'game' | 'results'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function TermMatch() {
  const { speak } = useVoice()

  const [phase, setPhase]             = useState<Phase>('instructions')
  const [round, setRound]             = useState(0)
  const [xp, setXp]                   = useState(0)
  const [matchStreak, setMatchStreak] = useState(0)
  const [totalMatched, setTotalMatched] = useState(0)
  const [cardStates, setCardStates]   = useState<Record<string, CardState>>({})
  const [terms, setTerms]             = useState<string[]>([])
  const [defs, setDefs]               = useState<string[]>([])
  const [comboMsg, setComboMsg]       = useState('')
  const [showCombo, setShowCombo]     = useState(false)
  const [wrongMsg, setWrongMsg]       = useState('')
  const [showWrong, setShowWrong]     = useState(false)
  const [showRoundBanner, setShowRoundBanner] = useState(false)
  const [roundBannerData, setRoundBannerData] = useState({ matched: 0, xp: 0 })

  // Mutable refs to avoid stale closures
  const roundPairsRef    = useRef<{ term: string; def: string }[]>([])
  const selectedTermRef  = useRef<string | null>(null)
  const selectedDefRef   = useRef<string | null>(null)
  const matchedCountRef  = useRef(0)
  const failedCountRef   = useRef(0)
  const matchStreakRef   = useRef(0)
  const bestStreakRef    = useRef(0)
  const xpRef            = useRef(0)
  const totalMatchedRef  = useRef(0)
  const roundRef         = useRef(0)

  const totalPairs = ROUNDS.reduce((a, r) => a + r.pairs.length, 0)

  const endRound = useCallback((completed: boolean) => {
    const isLast = roundRef.current >= ROUNDS.length - 1
    if (isLast || !completed) {
      setPhase('results')
    } else {
      setRoundBannerData({ matched: matchedCountRef.current, xp: xpRef.current })
      setShowRoundBanner(true)
    }
  }, [])

  const loadRound = useCallback((idx: number) => {
    const r   = ROUNDS[idx]
    const pairs = shuffle([...r.pairs])
    roundPairsRef.current   = pairs
    matchedCountRef.current = 0
    failedCountRef.current  = 0
    matchStreakRef.current  = 0
    selectedTermRef.current = null
    selectedDefRef.current  = null
    roundRef.current        = idx
    setTerms(shuffle(pairs.map(p => p.term)))
    setDefs(shuffle(pairs.map(p => p.def)))
    setCardStates({})
    setMatchStreak(0)
    setShowRoundBanner(false)
  }, [])

  const showComboToast = useCallback((n: number) => {
    const msgs = ['', '', '🔥 Combo ×2! +20 XP', '⚡ Triple! +30 XP', '💥 On fire! +40 XP']
    setComboMsg(msgs[Math.min(n, 4)] ?? '🔥 Combo!')
    setShowCombo(true)
    setTimeout(() => setShowCombo(false), 1400)
  }, [])

  const checkMatch = useCallback((term: string, def: string) => {
    selectedTermRef.current = null
    selectedDefRef.current  = null

    const pair    = roundPairsRef.current.find(p => p.term === term)
    const isMatch = pair?.def === def

    if (isMatch) {
      setCardStates(prev => ({ ...prev, [term]: 'matched', [def]: 'matched' }))
      matchStreakRef.current++
      matchedCountRef.current++
      totalMatchedRef.current++
      const streak = matchStreakRef.current
      if (streak > bestStreakRef.current) bestStreakRef.current = streak
      xpRef.current += 10 * Math.min(streak, 4)
      setMatchStreak(streak)
      setTotalMatched(totalMatchedRef.current)
      setXp(xpRef.current)
      if (streak >= 2) showComboToast(streak)

      // Voice: read the definition on match
      speak(`${term}. ${def}`)

      if (matchedCountRef.current >= roundPairsRef.current.length) {
        setTimeout(() => endRound(true), 700)
      }
    } else {
      setCardStates(prev => ({ ...prev, [term]: 'wrong', [def]: 'wrong' }))
      matchStreakRef.current = 0
      setMatchStreak(0)

      const wrongLines = [
        "Not quite — try another pair.",
        "Nope! Think about what that term really means.",
        "Wrong match — give it another shot.",
        "Not this one. You've got it though!",
      ]
      const line = wrongLines[Math.floor(Math.random() * wrongLines.length)]
      speak(line)
      setWrongMsg(line)
      setShowWrong(true)
      setTimeout(() => setShowWrong(false), 1800)
      setTimeout(() => {
        failedCountRef.current++
        setCardStates(prev => ({ ...prev, [term]: 'failed', [def]: 'normal' }))
        const total = roundPairsRef.current.length
        if (matchedCountRef.current + failedCountRef.current >= total) {
          setTimeout(() => endRound(true), 400)
        }
      }, 650)
    }
  }, [showComboToast, endRound, speak])

  const selectCard = useCallback((value: string, type: 'term' | 'def') => {
    if (type === 'term') {
      const prev = selectedTermRef.current
      // Clicking same card again = deselect
      if (prev === value) {
        selectedTermRef.current = null
        setCardStates(s => ({ ...s, [value]: 'normal' }))
        return
      }
      if (prev) setCardStates(s => ({ ...s, [prev]: 'normal' }))
      selectedTermRef.current = value
      setCardStates(s => ({ ...s, [value]: 'selected' }))
      if (selectedDefRef.current) checkMatch(value, selectedDefRef.current)
    } else {
      const prev = selectedDefRef.current
      // Clicking same card again = deselect
      if (prev === value) {
        selectedDefRef.current = null
        setCardStates(s => ({ ...s, [value]: 'normal' }))
        return
      }
      if (prev) setCardStates(s => ({ ...s, [prev]: 'normal' }))
      selectedDefRef.current = value
      setCardStates(s => ({ ...s, [value]: 'selected' }))
      if (selectedTermRef.current) checkMatch(selectedTermRef.current, value)
    }
  }, [checkMatch])

  const startGame = useCallback(() => {
    xpRef.current = 0; totalMatchedRef.current = 0; bestStreakRef.current = 0
    setXp(0); setTotalMatched(0); setRound(0)
    setPhase('game')
    loadRound(0)
  }, [loadRound])

  const nextRound = useCallback(() => {
    const next = roundRef.current + 1
    setRound(next)
    loadRound(next)
  }, [loadRound])

  // Keep round state in sync for display
  useEffect(() => { setRound(roundRef.current) }, [])

  const allPairs  = ROUNDS.flatMap(r => r.pairs)
  const grade     = xp >= 200 ? 'S' : xp >= 150 ? 'A' : xp >= 100 ? 'B' : 'C'
  const gradeEmoji: Record<string, string> = { S: '🏆', A: '🌟', B: '👍', C: '💪' }

  const matchedInRound = matchedCountRef.current
  const pairsInRound   = ROUNDS[round]?.pairs.length ?? 6

  function cardClass(value: string, isTerm: boolean) {
    const st = cardStates[value] ?? 'normal'
    return cn(
      'relative cursor-pointer transition-all duration-150 select-none h-[76px] flex items-center rounded-3xl border px-4 py-3 mb-2 overflow-hidden',
      isTerm && 'justify-center text-center text-sm font-bold tracking-wide',
      !isTerm && 'text-sm font-semibold leading-relaxed',
      st === 'normal'   && 'clay-card hover:shadow-lg hover:-translate-y-0.5 text-foreground',
      st === 'selected' && 'clay-card ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50/80 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 -translate-y-0.5',
      st === 'matched'  && cn('clay-card-success text-emerald-600 dark:text-emerald-400 cursor-default', styles.matchPop),
      st === 'wrong'    && cn('clay-card-danger text-red-600 dark:text-red-400', styles.wrongShake),
      st === 'failed'   && 'border-red-500/15 bg-red-500/5 text-red-300/30 cursor-not-allowed line-through',
    )
  }

  return (
    <div className={cn('min-h-screen bg-background', nunito.className)}>

      {/* HEADER */}
      <header className="w-full px-6 py-2.5 flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-base">🔗</span>
          <span className="text-sm font-bold text-foreground">TermMatch</span>
          <span className="text-white/20 text-xs">·</span>
          <span className="text-xs text-default-500">match terms & definitions</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="clay-card px-3 py-1 text-xs font-bold text-default-600">🔥 {matchStreak} streak</div>
          <div className="clay-card px-3 py-1 text-xs font-bold text-default-600">⭐ {xp} XP</div>
          <div className="clay-card px-3 py-1 text-xs font-bold text-default-600">✓ {totalMatched}/{totalPairs}</div>
        </div>
      </header>

      {/* INSTRUCTIONS */}
      {phase === 'instructions' && (
        <div className="max-w-6xl mx-auto px-8 py-20 grid grid-cols-[1fr_440px] gap-16 items-center min-h-[calc(100vh-65px)]">
          {/* Left: hero text */}
          <div>
            <div className="text-xs font-black text-red-500 uppercase tracking-widest mb-4">Financial literacy · 3 rounds</div>
            <h1 className="text-5xl font-black text-foreground leading-tight mb-6">
              Match the term<br />to its meaning.
            </h1>
            <p className="text-default-400 text-lg leading-relaxed mb-8 max-w-md">
              Tap a term, then tap its definition. Match all pairs to advance.
              Build combos for bonus XP — and hear each term explained when you get it right.
            </p>
            <button
              onClick={startGame}
              className="clay-btn bg-red-600 hover:bg-red-700 text-white px-12 py-5 text-xl font-black rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              Start matching →
            </button>
          </div>
          {/* Right: round cards */}
          <div className="flex flex-col gap-4">
            {[
              { round: '01', label: 'Money basics',           desc: '6 fundamental terms everyone should know',          color: '#CC0000', border: 'border-red-500/30',    bg: 'bg-red-500/5' },
              { round: '02', label: 'Banking & credit',       desc: 'Credit scores, APR, compound interest and more',    color: '#2563eb', border: 'border-blue-500/30',   bg: 'bg-blue-500/5' },
              { round: '03', label: 'Insurance',              desc: 'Premiums, claims, deductibles — how coverage works', color: '#7c3aed', border: 'border-purple-500/30', bg: 'bg-purple-500/5' },
            ].map(c => (
              <div key={c.round} className={cn('clay-card p-5 flex items-center gap-5 border', c.border, c.bg)}>
                <div className="text-3xl font-black shrink-0" style={{ color: c.color }}>{c.round}</div>
                <div>
                  <div className="font-black text-foreground text-base">{c.label}</div>
                  <div className="text-sm text-default-400 mt-0.5">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GAME */}
      {phase === 'game' && (
        <div className="max-w-6xl mx-auto px-8 py-6">
          {showRoundBanner ? (
            <div className={cn('flex flex-col items-center justify-center min-h-[70vh]', styles.fadeIn)}>
              <div className="text-7xl mb-6">🎉</div>
              <h2 className="text-4xl font-black text-foreground mb-3">Round {roundRef.current + 1} complete!</h2>
              <p className="text-default-400 text-lg mb-8">
                {roundBannerData.matched} pairs matched · {roundBannerData.xp} XP earned so far
              </p>
              <button
                onClick={nextRound}
                className="clay-btn bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-5 text-xl font-black rounded-2xl transition-all hover:-translate-y-1"
              >
                {ROUNDS[roundRef.current + 1]?.label} →
              </button>
            </div>
          ) : (
            <>
              {/* Round header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-xs font-black text-default-400 uppercase tracking-widest mb-1">Now playing</div>
                  <div className="text-2xl font-black text-foreground" style={{ color: ROUNDS[round]?.color }}>
                    {ROUNDS[round]?.label}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="clay-card px-4 py-2 text-sm font-black" style={{ color: ROUNDS[round]?.color }}>
                    {matchedInRound} / {pairsInRound} matched ✓
                  </div>
                  {/* Mini progress dots */}
                  <div className="flex gap-1.5">
                    {Array.from({ length: pairsInRound }, (_, i) => (
                      <div key={i} className={cn('w-2.5 h-2.5 rounded-full transition-all', i < matchedInRound ? 'bg-emerald-400' : 'bg-white/15')} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* TERMS */}
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-default-400 mb-3">Terms</div>
                  <div className="flex flex-col gap-2.5">
                    {terms.map(term => (
                      <div
                        key={term}
                        className={cardClass(term, true)}
                        onClick={() => {
                          const st = cardStates[term] ?? 'normal'
                          if (st !== 'matched' && st !== 'wrong' && st !== 'failed') selectCard(term, 'term')
                        }}
                      >
                        {term}
                        {cardStates[term] === 'matched' && (
                          <span className="absolute right-4 text-base text-emerald-400">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* DEFINITIONS */}
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-default-400 mb-3">Definitions</div>
                  <div className="flex flex-col gap-2.5">
                    {defs.map(def => (
                      <div
                        key={def}
                        className={cardClass(def, false)}
                        onClick={() => {
                          const st = cardStates[def] ?? 'normal'
                          if (st !== 'matched' && st !== 'wrong' && st !== 'failed') selectCard(def, 'def')
                        }}
                      >
                        <span className="line-clamp-2 pr-5">{def}</span>
                        {cardStates[def] === 'matched' && (
                          <span className="absolute right-4 text-base text-emerald-400 shrink-0">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* RESULTS */}
      {phase === 'results' && (
        <div className="max-w-6xl mx-auto px-8 py-16">
          <div className="grid grid-cols-[1fr_480px] gap-12 items-start">
            {/* Left: score */}
            <div>
              <div className="text-8xl mb-4">{gradeEmoji[grade]}</div>
              <div className="text-5xl font-black text-foreground mb-2">Grade {grade}</div>
              <div className="text-default-400 text-lg mb-8">{totalMatched} of {totalPairs} pairs matched</div>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { val: xp,           lbl: 'Total XP',    color: 'text-red-500' },
                  { val: totalMatched, lbl: 'Matched',      color: 'text-emerald-500' },
                  { val: bestStreakRef.current, lbl: 'Best streak', color: 'text-amber-500' },
                ].map(s => (
                  <div key={s.lbl} className="clay-card p-5 text-center">
                    <div className={cn('text-3xl font-black', s.color)}>{s.val}</div>
                    <div className="text-xs text-default-400 font-bold mt-1 uppercase tracking-wide">{s.lbl}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={startGame}
                className="clay-btn bg-red-600 hover:bg-red-700 text-white px-10 py-4 text-lg font-black rounded-2xl transition-all hover:-translate-y-0.5"
              >
                Play again →
              </button>
            </div>

            {/* Right: term glossary */}
            <div className="clay-card p-6">
              <h3 className="text-xs font-black text-default-400 uppercase tracking-widest mb-4">📖 Terms you learned today</h3>
              <div className="flex flex-col divide-y divide-white/10">
                {allPairs.map(p => (
                  <div key={p.term} className="py-3 flex gap-4">
                    <span className="font-black text-red-500 shrink-0 text-sm w-36">{p.term}</span>
                    <span className="text-default-400 text-sm leading-relaxed">{p.def}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMBO TOAST */}
      <div className={cn(
        'fixed top-24 left-1/2 -translate-x-1/2 clay-card px-6 py-3 text-base font-black text-amber-500 border-amber-300/30 pointer-events-none z-50 transition-all duration-300',
        showCombo ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5',
      )}>
        {comboMsg}
      </div>

      {/* WRONG TOAST */}
      <div className={cn(
        'fixed top-24 left-1/2 -translate-x-1/2 clay-card px-6 py-3 text-base font-black text-red-400 border-red-400/30 pointer-events-none z-50 transition-all duration-300',
        showWrong ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5',
      )}>
        ❌ {wrongMsg}
      </div>
    </div>
  )
}
