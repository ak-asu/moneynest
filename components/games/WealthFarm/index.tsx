'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { DM_Sans, Pixelify_Sans } from 'next/font/google'
import { cn } from '@/lib/utils/cn'
import styles from './wealthfarm.module.css'

// Pixelify only for branding/decorative headings; DM_Sans for all numbers and body
const pixelify = Pixelify_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })
const dmSans   = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const ASSETS = [
  {
    id: 'savings', name: 'Savings Account', icon: '💧', color: '#60a5fa',
    risk: 'No risk', riskColor: '#60a5fa',
    rateMin: .02, rateMax: .045,
    source: 'FDIC',
    desc: 'FDIC-insured up to $250,000. Earns 2–4% interest — safe, but inflation slowly erodes its value over time.',
  },
  {
    id: 'index', name: 'Index Fund', icon: '🌾', color: '#4ade80',
    risk: 'Low risk', riskColor: '#4ade80',
    rateMin: .06, rateMax: .13,
    source: 'S&P 500',
    desc: 'Tracks the S&P 500 — 500 of the biggest US companies. Historical 10-yr average: ~10%/yr. Boring is powerful.',
  },
  {
    id: 'stock', name: 'Tech Stocks', icon: '🚀', color: '#f87171',
    risk: 'High risk', riskColor: '#f87171',
    rateMin: -.30, rateMax: .40,
    source: 'NASDAQ',
    desc: 'High variance — NASDAQ gained 43% in 2023 and crashed 33% in 2022. High ceiling, real floor.',
  },
  {
    id: 'bonds', name: 'Bonds', icon: '🪨', color: '#fbbf24',
    risk: 'Very low risk', riskColor: '#fbbf24',
    rateMin: .03, rateMax: .05,
    source: 'US Treasury',
    desc: 'Loaning money to the US government. Backed by Treasury yields (4–5%). Safe but hurt when interest rates rise.',
  },
  {
    id: 'realty', name: 'Real Estate', icon: '🏡', color: '#a78bfa',
    risk: 'Medium risk', riskColor: '#a78bfa',
    rateMin: .03, rateMax: .14,
    source: 'Case-Shiller',
    desc: 'Tracks the Case-Shiller Home Price Index — national avg +5.4%/yr since 2000. Slow to move, hard to lose.',
  },
] as const

type AssetId = typeof ASSETS[number]['id']

type GameEvent = {
  icon: string; title: string; desc: string
  voice: string; source: string; lesson: string
  effects: Partial<Record<AssetId, number>>; color: string
}

// Pool of 15 events — 9 are randomly drawn each game for years 2–10
const EVENT_POOL: GameEvent[] = [
  {
    icon: '💥', title: '2008 Financial Crisis', color: '#f87171',
    source: 'Based on 2008',
    desc: 'The S&P 500 fell 38.5%. Real estate collapsed. Diversified investors eventually recovered.',
    voice: 'Financial crisis. The S&P 500 fell 38 percent. This is why diversification matters.',
    lesson: 'The S&P 500 fell 38.5% in 2008. Diversified investors recovered by 2013. Those who sold at the bottom never did.',
    effects: { stock: -.35, index: -.20, realty: -.15, bonds: .05 },
  },
  {
    icon: '🌧️', title: 'Fed Rate Hike Cycle', color: '#f87171',
    source: 'Based on 2022',
    desc: 'The Fed raised rates 7 times to fight inflation. Growth stocks and bonds both took a hit.',
    voice: 'The Fed raised interest rates seven times. Growth stocks and bonds both dropped.',
    lesson: 'The Fed raised rates 7× in 2022 to fight inflation. When borrowing costs rise, growth stocks fall hardest — and older bonds lose value too.',
    effects: { stock: -.19, index: -.15, bonds: -.10, savings: .015 },
  },
  {
    icon: '🌞', title: 'Market Recovery', color: '#4ade80',
    source: 'Based on 2023',
    desc: 'Markets bounced back. S&P 500 gained 24%, Nasdaq surged 43%.',
    voice: 'Markets recovered. The S&P 500 gained 24 percent. Staying invested paid off.',
    lesson: 'Markets recovered in 2023 — the S&P 500 gained 24%. Staying invested through downturns is how long-term investors win.',
    effects: { stock: .35, index: .20 },
  },
  {
    icon: '🏡', title: 'Real Estate Boom', color: '#a78bfa',
    source: 'Based on 2021',
    desc: 'US home prices rose 18.8% (Case-Shiller). Low rates + remote work demand exploded housing.',
    voice: 'Real estate boom. US home prices rose nearly 19 percent. Property investors are winning big.',
    lesson: 'US home prices rose 18.8% in 2021 per Case-Shiller. Low interest rates and remote work demand created a historic housing boom.',
    effects: { realty: .18, stock: .10 },
  },
  {
    icon: '📈', title: 'Recovery Rally', color: '#4ade80',
    source: 'Based on 2009',
    desc: 'After the crash, the S&P 500 gained 26.5%. The biggest gains follow the biggest panic.',
    voice: 'Recovery rally. The S&P 500 gained 26 percent. The biggest gains come right after the panic.',
    lesson: 'After the 2008 crash, the S&P 500 gained 26.5% in 2009. The biggest gains often come right after the biggest panic.',
    effects: { stock: .25, index: .15 },
  },
  {
    icon: '🌾', title: 'Sustained Bull Market', color: '#4ade80',
    source: 'Based on 2013–2021',
    desc: 'Index fund investors who stayed in turned $1,000 into $4,200 over 8 years of steady growth.',
    voice: 'Sustained bull market. Eight years of steady growth rewards patient investors.',
    lesson: 'Index fund investors who held 2013–2021 turned $1,000 into $4,200. Time in the market beats timing the market.',
    effects: { index: .10, stock: .12, realty: .08 },
  },
  {
    icon: '🌪️', title: 'Inflation Spike', color: '#fbbf24',
    source: 'Based on 2022',
    desc: 'US inflation hit 8.5% — a 40-year high. Cash and bonds lose real value. Hard assets hold up.',
    voice: 'Inflation spiked to 8.5 percent, a 40-year high. Cash is losing real value.',
    lesson: 'US inflation hit 8.5% in 2022 — a 40-year high. Cash and bonds lose purchasing power. Real assets like property hold up.',
    effects: { savings: -.04, bonds: -.06, realty: .10 },
  },
  {
    icon: '🤖', title: 'AI & Tech Rebound', color: '#60a5fa',
    source: 'Based on 2023',
    desc: 'NASDAQ gained 43% in 2023 driven by AI enthusiasm. High-risk recovered hard.',
    voice: 'AI and tech rebound. The NASDAQ gained 43 percent. High-risk can recover sharply.',
    lesson: 'The NASDAQ gained 43% in 2023 driven by AI growth. High-risk assets can recover sharply — but only if you didn\'t sell during the crash.',
    effects: { stock: .38, index: .15 },
  },
  {
    icon: '🏦', title: 'Banking Crisis', color: '#f87171',
    source: 'Based on 2023 SVB',
    desc: 'Regional banks collapsed. Investors fled to safety — bonds and savings surged, stocks dipped.',
    voice: 'Banking crisis. Regional banks collapsed. Investors moved to safer assets.',
    lesson: 'When SVB collapsed in 2023, scared investors moved money into bonds and savings accounts. Diversification across asset types protects against sector shocks.',
    effects: { stock: -.12, bonds: .06, savings: .02, index: -.06 },
  },
  {
    icon: '⚡', title: 'Energy Boom', color: '#fbbf24',
    source: 'Based on 2021–2022',
    desc: 'Global energy prices surged post-pandemic. Real assets and inflation hedges led the market.',
    voice: 'Energy boom. Global energy prices surged. Real assets and inflation hedges are winning.',
    lesson: 'Energy prices doubled in 2021-2022. Commodities and real estate often rise with inflation, showing why not all assets move together.',
    effects: { realty: .12, savings: .01, stock: .08, bonds: -.03 },
  },
  {
    icon: '🎯', title: 'IPO Frenzy', color: '#4ade80',
    source: 'Based on 2021',
    desc: 'Record IPOs and SPAC deals. Tech stocks and index funds both surged on optimism.',
    voice: 'IPO frenzy. Record new companies went public. Tech and index funds surged on investor optimism.',
    lesson: 'In 2021, over 1,000 companies went public. Hype-driven markets can lift all assets — but they also set the stage for sharp corrections.',
    effects: { stock: .22, index: .12 },
  },
  {
    icon: '🦠', title: 'COVID Crash', color: '#f87171',
    source: 'Based on 2020',
    desc: 'Markets lost 34% in 33 days — the fastest crash in history. Then the fastest recovery too.',
    voice: 'COVID crash. Markets lost 34 percent in 33 days. The fastest crash in history.',
    lesson: 'In 2020 the S&P 500 crashed 34% in 33 days, then fully recovered in just 5 months. Panic selling locked in losses. Staying in captured the rebound.',
    effects: { stock: -.30, index: -.25, realty: -.08, bonds: .04 },
  },
  {
    icon: '💻', title: 'Dot-Com Bubble Burst', color: '#f87171',
    source: 'Based on 2000–2002',
    desc: 'The NASDAQ lost 78% as tech valuations collapsed. Diversified portfolios fared far better.',
    voice: 'Dot-com bubble burst. The NASDAQ lost 78 percent. Diversification was the only shelter.',
    lesson: 'The NASDAQ fell 78% from 2000–2002 as internet valuations collapsed. Concentrated tech bets were wiped out. Diversification across asset classes cushioned the blow.',
    effects: { stock: -.40, index: -.22, bonds: .08, savings: .02 },
  },
  {
    icon: '🚀', title: 'Post-COVID Boom', color: '#4ade80',
    source: 'Based on 2020–2021',
    desc: 'Stimulus checks + low rates ignited a historic boom. Stocks, real estate, and crypto all surged.',
    voice: 'Post-COVID boom. Stimulus and low rates ignited a historic rally across all assets.',
    lesson: 'After the 2020 crash, the S&P 500 gained 100% in 18 months. Easy money and fiscal stimulus created one of the fastest bull markets ever recorded.',
    effects: { stock: .40, index: .28, realty: .20, bonds: -.03 },
  },
  {
    icon: '🏛️', title: 'Government Stimulus', color: '#4ade80',
    source: 'Based on 2009 / 2020',
    desc: 'Massive government spending propped up markets. Bonds and real estate led the recovery.',
    voice: 'Government stimulus. Massive spending propped up markets. Safety assets led the recovery.',
    lesson: 'Both the 2009 and 2020 recoveries were turbocharged by government stimulus. Understanding policy impact is as important as understanding markets.',
    effects: { bonds: .08, realty: .10, index: .12, savings: .01 },
  },
]

function generateGameEvents(): Record<number, GameEvent | null> {
  // Shuffle pool, assign 9 unique random events to years 2–10 (6 sit out each game)
  const shuffled = [...EVENT_POOL]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const map: Record<number, GameEvent | null> = {}
  for (let yr = 1; yr <= 10; yr++) {
    map[yr] = shuffled[yr - 1] ?? null
  }
  return map
}

const SEASONS = [
  { icon: '🌸', name: 'Spring', desc: 'Bull market. Good conditions for growth.' },
  { icon: '☀️', name: 'Summer', desc: 'Volatile markets. Watch your portfolio.' },
  { icon: '🍂', name: 'Fall',   desc: 'Harvest time. Dividends and interest paid.' },
  { icon: '❄️', name: 'Winter', desc: 'Bear market. Some assets may dip.' },
]

type SimPhase = 'idle' | 'running' | 'paused-yr5' | 'finished'
type Phase    = 'intro' | 'game' | 'results'

function rand(min: number, max: number) { return min + Math.random() * (max - min) }

function applyYear(
  portfolio: Record<AssetId, number>,
  year: number,
  gameEventsMap: Record<number, GameEvent | null>,
): { portfolio: Record<AssetId, number>; event: GameEvent | null } {
  const next   = { ...portfolio }
  const event  = gameEventsMap[year] ?? null
  const season = SEASONS[(year - 1) % 4]

  ASSETS.forEach(a => {
    if (next[a.id] <= 0) return
    const base = rand(a.rateMin, a.rateMax)
    const mod  = event
      ? (event.effects[a.id] ?? 0)
      : (season.name === 'Winter' ? -0.02 : season.name === 'Spring' ? 0.01 : 0)
    next[a.id] = Math.max(0, next[a.id] * (1 + base + mod))
  })

  return { portfolio: next, event }
}

function emptyPortfolio(): Record<AssetId, number> {
  return { savings: 0, index: 0, stock: 0, bonds: 0, realty: 0 }
}

export function WealthFarm() {

  const [phase, setPhase]       = useState<Phase>('intro')
  const [simPhase, setSimPhase] = useState<SimPhase>('idle')
  const [simYear, setSimYear]   = useState(1)

  const [cash, setCash]           = useState(1000)
  const [portfolio, setPortfolio] = useState<Record<AssetId, number>>(emptyPortfolio)
  const [origCosts, setOrigCosts] = useState<Record<AssetId, number>>(emptyPortfolio)

  const [currentEvent, setCurrentEvent]   = useState<GameEvent | null>(null)

  // Pre-simulation allocation (editable table)
  const [preAlloc, setPreAlloc] = useState<Record<AssetId, string>>(
    () => ({ savings: '', index: '', stock: '', bonds: '', realty: '' })
  )

  const [rebalanceAlloc, setRebalanceAlloc] = useState<Record<AssetId, string>>(
    () => ({ savings: '0', index: '0', stock: '0', bonds: '0', realty: '0' })
  )
  const [eventLog, setEventLog]   = useState<Array<{ yr: number; event: GameEvent | null }>>([])
  const [aiInsight, setAiInsight] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const simPhaseRef      = useRef<SimPhase>('idle')
  const simYearRef       = useRef(1)
  const portfolioRef     = useRef(portfolio)
  portfolioRef.current   = portfolio
  const gameEventsMapRef = useRef<Record<number, GameEvent | null>>({})

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startNetWorth = 1000

  function netWorth(p: Record<AssetId, number>, c: number) {
    return c + Object.values(p).reduce((a, b) => a + b, 0)
  }

  const nw        = netWorth(portfolio, cash)
  const change    = nw - startNetWorth
  const changePct = ((change / startNetWorth) * 100).toFixed(1)
  const total     = Object.values(portfolio).reduce((a, b) => a + b, 0) + cash

  const season = SEASONS[(simYear - 1) % 4]

  // ── SIMULATION TICK ──────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const nextYear = simYearRef.current + 1
    if (nextYear > 10) return

    simYearRef.current = nextYear

    const { portfolio: next, event } = applyYear(portfolioRef.current, nextYear, gameEventsMapRef.current)
    setPortfolio(next)
    setSimYear(nextYear)
    setCurrentEvent(event)
    setEventLog(prev => [...prev, { yr: nextYear, event }])

    if (nextYear === 5) {
      const rounded = ASSETS.reduce((acc, a) => { acc[a.id] = Math.round(next[a.id]); return acc }, {} as Record<AssetId, number>)
      const diff = Math.round(next.savings + next.index + next.stock + next.bonds + next.realty) - Object.values(rounded).reduce((a, b) => a + b, 0)
      if (diff !== 0) {
        const adjust = ASSETS.map(a => ({ id: a.id, frac: next[a.id] - Math.floor(next[a.id]) }))
          .sort((a, b) => diff > 0 ? b.frac - a.frac : a.frac - b.frac)[0]
        rounded[adjust.id] += diff
      }
      setRebalanceAlloc({
        savings: String(rounded.savings),
        index:   String(rounded.index),
        stock:   String(rounded.stock),
        bonds:   String(rounded.bonds),
        realty:  String(rounded.realty),
      })
      if (timerRef.current) clearInterval(timerRef.current)
      simPhaseRef.current = 'paused-yr5'
      setSimPhase('paused-yr5')
      return
    }

    if (nextYear >= 10) {
      if (timerRef.current) clearInterval(timerRef.current)
      simPhaseRef.current = 'finished'
      setSimPhase('finished')
      setTimeout(() => setPhase('results'), 1800)
    }
  }, [])

  useEffect(() => {
    if (simPhase !== 'running') return
    timerRef.current = setInterval(tick, 1600)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [simPhase, tick])

  // Pre-alloc totals
  const preAllocTotal     = ASSETS.reduce((s, a) => s + (parseFloat(preAlloc[a.id]) || 0), 0)
  const preAllocRemaining = Math.max(0, 1000 - preAllocTotal)

  // Rebalance totals (Year 5) — compare against Math.round(nw) so cent-level rounding noise never triggers "over budget"
  const nwBudget                = Math.round(nw)
  const rebalanceAllocTotal     = ASSETS.reduce((s, a) => s + (parseFloat(rebalanceAlloc[a.id]) || 0), 0)
  const rebalanceAllocRemaining = Math.max(0, nwBudget - rebalanceAllocTotal)

  // ── START SIMULATION ──────────────────────────────────────────────────────
  function startSim() {
    gameEventsMapRef.current = generateGameEvents()
    setEventLog([])
    const parsed = ASSETS.reduce((acc, a) => {
      acc[a.id] = Math.max(0, parseFloat(preAlloc[a.id]) || 0)
      return acc
    }, {} as Record<AssetId, number>)
    const remaining = Math.max(0, 1000 - Object.values(parsed).reduce((a, b) => a + b, 0))
    setPortfolio(parsed)
    setOrigCosts({ ...parsed })
    setCash(remaining)
    simYearRef.current = 0
    simPhaseRef.current = 'running'
    setSimPhase('running')
  }

  // ── RESUME AFTER YR5 ─────────────────────────────────────────────────────
  function resumeAfterRebalance() {
    const parsed = ASSETS.reduce((acc, a) => {
      acc[a.id] = Math.max(0, parseFloat(rebalanceAlloc[a.id]) || 0)
      return acc
    }, {} as Record<AssetId, number>)
    const allocatedTotal = Object.values(parsed).reduce((a, b) => a + b, 0)
    const remaining = Math.max(0, nw - allocatedTotal)
    setPortfolio(parsed)
    setOrigCosts({ ...parsed })
    setCash(remaining)
    simPhaseRef.current = 'running'
    setSimPhase('running')
  }

  // ── RESTART ──────────────────────────────────────────────────────────────
  function restartFarm() {
    if (timerRef.current) clearInterval(timerRef.current)
    setCash(1000); setSimYear(1)
    setPortfolio(emptyPortfolio()); setOrigCosts(emptyPortfolio())
    setPreAlloc({ savings: '', index: '', stock: '', bonds: '', realty: '' })
    setCurrentEvent(null)
    setRebalanceAlloc({ savings: '0', index: '0', stock: '0', bonds: '0', realty: '0' })
    setEventLog([])
    setAiInsight('')
    simYearRef.current = 1
    simPhaseRef.current = 'idle'
    setSimPhase('idle')
    setPhase('intro')
  }

  // ── AI INSIGHT ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'results') return
    setAiLoading(true)
    const logText = eventLog.length > 0
      ? eventLog.map(e => `Year ${e.yr}: ${e.event ? e.event.title : 'No event'}`).join('\n')
      : 'No events recorded'
    const allocText = ASSETS.map(a => `${a.name}: $${Math.round(portfolio[a.id])}`).join(', ')
    const prompt = `You are a financial literacy coach. A student just completed a 10-year investment simulation.

Starting amount: $1,000
Final net worth: $${Math.round(nw)}
Final portfolio: ${allocText}
Cash remaining: $${Math.round(cash)}

Events that happened:
${logText}

In 3-4 sentences, give personalized feedback:
1. What they did well (or not)
2. How the events affected their specific allocation
3. One concrete lesson about real-world investing they should take away

Keep it friendly, educational, and specific to their results. No markdown, just plain text.`

    fetch('/api/ai-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
      .then(r => r.json())
      .then(d => setAiInsight(d.text ?? d.error ?? 'No insight available.'))
      .catch(() => setAiInsight('Could not generate insight at this time.'))
      .finally(() => setAiLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── RESULTS ──────────────────────────────────────────────────────────────
  const bestAsset = ASSETS.reduce((best, a) => portfolio[a.id] > portfolio[best.id] ? a : best, ASSETS[0])
  const grade = nw >= 3000 ? '🏆' : nw >= 2000 ? '⭐' : nw >= 1500 ? '👍' : '💪'
  const gradeText = nw >= 3000 ? 'Master Farmer!' : nw >= 2000 ? 'Seasoned Investor' : nw >= 1500 ? 'Growing Strong' : 'Keep Planting!'

  const SP500_10YR = Math.round(1000 * Math.pow(1.10, 10)) // $2,594
  const beatMarket = nw > SP500_10YR

  const isSimulating = simPhase === 'running'
  const isPausedYr5  = simPhase === 'paused-yr5'


  return (
    <div className={cn('min-h-screen bg-background', dmSans.className)}>

      {/* HEADER */}
      <header className="w-full px-6 py-2.5 flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-base">🌱</span>
          <span className={cn('text-sm font-bold text-foreground', pixelify.className)}>WealthFarm</span>
          <span className="text-white/20 text-xs">·</span>
          <span className="text-xs text-default-500">10-year sim</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="clay-card px-3 py-1 text-xs font-semibold text-default-400">
            Yr <b className="text-foreground">{simYear}</b>/10
          </div>
          <div className="clay-card px-3 py-1 text-xs font-semibold text-default-400">
            💵 <b className="text-foreground">${Math.round(cash).toLocaleString()}</b>
          </div>
          <div className="clay-card px-3 py-1 text-xs font-semibold text-default-400">
            📈 <b className="text-foreground">${Math.round(nw).toLocaleString()}</b>
          </div>
        </div>
      </header>

      {/* ── INTRO ──────────────────────────────────────────────────────── */}
      {phase === 'intro' && (
        <div className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-[1fr_520px] gap-16 items-center min-h-[calc(100vh-65px)]">
          {/* Left: hero */}
          <div>
            <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4">10-year investment simulation</div>
            <h1 className={cn('text-5xl font-bold text-foreground leading-tight mb-6', pixelify.className)}>
              Grow your <span className="text-emerald-400">$1,000</span><br />
              into something<br />
              <span className="text-amber-400">real.</span>
            </h1>
            <p className="text-default-400 text-lg leading-relaxed mb-8 max-w-md">
              Plant your money into different investments. Watch real market events unfold over 10 years.
              At Year 5, decide if you want to rebalance. At Year 10, see what you built.
            </p>
            <button
              onClick={() => setPhase('game')}
              className={cn('clay-btn bg-emerald-700 hover:bg-emerald-600 text-white px-12 py-5 text-xl font-bold rounded-2xl transition-all hover:-translate-y-1 hover:shadow-xl', pixelify.className)}
            >
              Start farming →
            </button>

            {/* Real-data stat pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              {[
                { icon: '📊', text: 'Only 24% of teens pass a basic money literacy test', src: 'CFPB' },
                { icon: '📈', text: '$1,000 in the S&P 500 in 2013 = ~$3,200 by 2023', src: 'S&P 500' },
                { icon: '🏦', text: 'FDIC insures bank deposits up to $250,000', src: 'FDIC' },
              ].map(s => (
                <div key={s.src} className="clay-card px-3 py-2 text-xs text-default-400 flex items-start gap-2 max-w-[220px]">
                  <span className="shrink-0">{s.icon}</span>
                  <span>{s.text} <span className="text-default-500 italic">— {s.src}</span></span>
                </div>
              ))}
            </div>
          </div>
          {/* Right: asset cards */}
          <div className="flex flex-col gap-3">
            {ASSETS.map(a => (
              <div key={a.id} className="clay-card p-4 flex items-center gap-4">
                <span className="text-3xl shrink-0">{a.icon}</span>
                <div className="flex-1">
                  <div className="font-bold text-foreground">{a.name}</div>
                  <div className="text-sm text-default-400 mt-0.5">{a.desc}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold" style={{ color: a.color }}>{a.risk}</div>
                  <div className="text-xs text-default-400 mt-0.5">
                    {Math.round(a.rateMin * 100)}–{Math.round(a.rateMax * 100)}%/yr
                  </div>
                  <div className="text-[10px] text-default-500 mt-0.5 italic">{a.source}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GAME ───────────────────────────────────────────────────────── */}
      {phase === 'game' && (
        <div className="max-w-7xl mx-auto w-full px-8 py-6 grid grid-cols-[1fr_380px] gap-6 items-start">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4">

            {/* Year / season bar */}
            <div className="clay-card px-5 py-4 flex items-center gap-4">
              <span className="text-3xl">{isSimulating || simPhase === 'finished' ? season.icon : '🌱'}</span>
              <div className="flex-1">
                <div className="font-bold text-amber-400 text-base">
                  {simPhase === 'idle' ? 'Year 1 — Plant your seeds' : `${season.name} · Year ${simYear}`}
                </div>
                <div className="text-sm text-default-500 mt-0.5">
                  {simPhase === 'idle' ? 'Allocate your $1,000 before the simulation starts.' : season.desc}
                </div>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className={cn('w-3 h-3 rounded-full transition-all', {
                    'bg-amber-400': i < simYear - 1,
                    'bg-emerald-400 scale-110': i === simYear - 1,
                    'bg-white/10': i > simYear - 1,
                  })} />
                ))}
              </div>
            </div>

            {/* Market event */}
            {currentEvent && (
              <div className={cn('clay-card px-5 py-4 border-l-4', styles.fadeIn)} style={{ borderColor: currentEvent.color }}>
                <div className="flex items-center gap-4">
                  <span className="text-3xl shrink-0">{currentEvent.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base" style={{ color: currentEvent.color }}>{currentEvent.title}</span>
                      {currentEvent.source && (
                        <span className="text-[10px] italic text-default-400">{currentEvent.source}</span>
                      )}
                    </div>
                    <div className="text-sm text-default-400 mt-0.5">{currentEvent.desc}</div>
                  </div>
                </div>
                {currentEvent.lesson && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200 leading-relaxed">
                    📚 {currentEvent.lesson}
                  </div>
                )}
              </div>
            )}

            {/* Simulating indicator */}
            {isSimulating && (
              <div className="clay-card px-5 py-3 text-center text-sm text-default-400 font-semibold animate-pulse">
                ⏳ Markets moving... Year {simYear} of 10
              </div>
            )}

            {/* ── IDLE: allocation table ── */}
            {simPhase === 'idle' && (
              <div className="clay-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-emerald-400 text-base">🌱 Allocate your $1,000</div>
                  <div className="text-sm font-semibold">
                    <span className="text-default-400">${Math.round(preAllocTotal)} allocated · </span>
                    <span className={preAllocTotal > 1000 ? 'text-red-400' : 'text-amber-400'}>
                      {preAllocTotal > 1000 ? `-$${Math.round(preAllocTotal - 1000)} over` : `$${Math.round(preAllocRemaining)} left`}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 mb-4 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400 transition-all duration-200"
                    style={{ width: `${Math.min(100, (preAllocTotal / 1000) * 100)}%` }} />
                </div>
                <div className="flex flex-col divide-y divide-white/5">
                  {ASSETS.map(a => (
                    <div key={a.id} className="flex items-center gap-4 py-3">
                      <span className="text-2xl shrink-0">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground">{a.name}</div>
                        <div className="text-xs text-default-500 mt-0.5">
                          {a.source} · <span style={{ color: a.riskColor }}>{a.risk}</span> · {Math.round(a.rateMin * 100)}–{Math.round(a.rateMax * 100)}%/yr
                        </div>
                      </div>
                      <div className="relative shrink-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-default-400 pointer-events-none">$</span>
                        <input
                          type="number"
                          placeholder="0"
                          min={0}
                          max={1000}
                          step={50}
                          value={preAlloc[a.id]}
                          onChange={e => setPreAlloc(p => ({ ...p, [a.id]: e.target.value }))}
                          className="clay-input w-28 pl-6 pr-3 py-2 text-sm text-foreground outline-none text-right"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      const each = String(Math.floor(1000 / ASSETS.length))
                      setPreAlloc({ savings: each, index: each, stock: each, bonds: each, realty: each })
                    }}
                    className="clay-card px-4 py-2 text-xs font-bold rounded-xl hover:border-emerald-400/50 cursor-pointer"
                  >
                    Split evenly
                  </button>
                  <button
                    onClick={() => setPreAlloc({ savings: '', index: '', stock: '', bonds: '', realty: '' })}
                    className="clay-card px-4 py-2 text-xs font-bold rounded-xl hover:border-red-400/30 text-default-400 cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            {/* ── YEAR 5 REBALANCE ── */}
            {isPausedYr5 && (
              <div className="clay-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-amber-400 text-base">🔀 Rebalance your portfolio</div>
                  <div className="text-sm font-semibold">
                    <span className="text-default-400">${Math.round(rebalanceAllocTotal)} allocated · </span>
                    <span className={rebalanceAllocTotal > nwBudget ? 'text-red-400' : 'text-amber-400'}>
                      {rebalanceAllocTotal > nwBudget ? `-$${Math.round(rebalanceAllocTotal - nwBudget)} over` : `$${Math.round(rebalanceAllocRemaining)} unallocated`}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 mb-4 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400 transition-all duration-200"
                    style={{ width: `${Math.min(100, (rebalanceAllocTotal / nw) * 100)}%` }} />
                </div>
                <div className="flex flex-col divide-y divide-white/5">
                  {ASSETS.map(a => (
                    <div key={a.id} className="flex items-center gap-4 py-3">
                      <span className="text-2xl shrink-0">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground">{a.name}</div>
                        <div className="text-xs text-default-500 mt-0.5">
                          {a.source} · <span style={{ color: a.riskColor }}>{a.risk}</span> · {Math.round(a.rateMin * 100)}–{Math.round(a.rateMax * 100)}%/yr
                        </div>
                      </div>
                      <div className="relative shrink-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-default-400 pointer-events-none">$</span>
                        <input
                          type="number"
                          placeholder="0"
                          min={0}
                          max={Math.round(nw)}
                          step={50}
                          value={rebalanceAlloc[a.id]}
                          onChange={e => setRebalanceAlloc(p => ({ ...p, [a.id]: e.target.value }))}
                          className="clay-input w-28 pl-6 pr-3 py-2 text-sm text-foreground outline-none text-right"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      const base = Math.floor(nwBudget / ASSETS.length)
                      const rem  = nwBudget - base * ASSETS.length
                      setRebalanceAlloc({ savings: String(base + rem), index: String(base), stock: String(base), bonds: String(base), realty: String(base) })
                    }}
                    className="clay-card px-4 py-2 text-xs font-bold rounded-xl hover:border-amber-400/50 cursor-pointer"
                  >
                    Split evenly
                  </button>
                  <button
                    onClick={() => setRebalanceAlloc({ savings: '0', index: '0', stock: '0', bonds: '0', realty: '0' })}
                    className="clay-card px-4 py-2 text-xs font-bold rounded-xl hover:border-red-400/30 text-default-400 cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            {/* Year 5 pause CTA */}
            {isPausedYr5 && (
              <div className="clay-card border-amber-400/30 px-6 py-5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-400 text-base mb-1">⏸ Year 5 check-in</div>
                  <div className="text-sm text-default-500">Halfway done. Sell and reinvest above, or continue as-is.</div>
                </div>
                <button onClick={resumeAfterRebalance} disabled={rebalanceAllocTotal > nwBudget}
                  className={cn('clay-btn bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-3 font-bold rounded-2xl transition-all', rebalanceAllocTotal > nwBudget ? dmSans.className : pixelify.className)}>
                  {rebalanceAllocTotal > nwBudget ? `Over by $${Math.round(rebalanceAllocTotal - nwBudget)}` : 'Continue to Year 10 →'}
                </button>
              </div>
            )}

            {/* Start sim button */}
            {simPhase === 'idle' && (
              <button onClick={startSim} disabled={preAllocTotal > 1000}
                className={cn('clay-btn bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-black px-6 py-4 font-bold rounded-2xl transition-all text-base w-full hover:-translate-y-0.5', preAllocTotal > 1000 ? dmSans.className : pixelify.className)}>
                {preAllocTotal > 1000 ? `Over budget by $${Math.round(preAllocTotal - 1000)}` : '⏩ Start simulation — watch 10 years unfold'}
              </button>
            )}
          </div>

          {/* RIGHT COLUMN — Portfolio (sticky) */}
          <div className="sticky top-[73px] flex flex-col gap-4">
            <div className="clay-card p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-bold text-amber-400 uppercase tracking-widest">Portfolio</div>
              </div>
              <div className="text-4xl font-bold text-emerald-400 mb-1">${Math.round(nw).toLocaleString()}</div>
              <div className="text-sm font-semibold mb-4" style={{ color: change >= 0 ? '#4ade80' : '#f87171' }}>
                {change >= 0 ? '+' : ''}${Math.round(Math.abs(change)).toLocaleString()} ({change >= 0 ? '+' : ''}{changePct}%) vs start
              </div>
              <div className="flex items-center gap-3 px-3 mb-1">
                <div className="text-[10px] text-default-500 uppercase tracking-wide flex-1">Asset</div>
                <div className="text-[10px] text-default-500 uppercase tracking-wide w-8 text-right">Alloc</div>
                <div className="text-[10px] text-default-500 uppercase tracking-wide w-16 text-right">Value</div>
                <div className="text-[10px] text-default-500 uppercase tracking-wide w-12 text-right">Return</div>
              </div>
              <div className="flex flex-col gap-2">
                {[{ id: 'cash', name: 'Cash', icon: '💵', color: '#fbbf24', value: cash }, ...ASSETS.map(a => ({ ...a, value: portfolio[a.id] }))].map(item => {
                  if (item.value <= 0 && item.id !== 'cash') return null
                  const orig = item.id === 'cash' ? 0 : (origCosts[item.id as AssetId] ?? 0)
                  const gain = item.value - orig
                  const gPct = orig > 0 ? ((gain / orig) * 100).toFixed(1) : null
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                      <div className="text-sm flex-1 text-foreground font-medium">{item.icon} {item.name}</div>
                      <div className="text-xs text-default-400 w-8 text-right">{Math.round((item.value / total) * 100)}%</div>
                      <div className="text-sm font-bold w-16 text-right">${Math.round(item.value).toLocaleString()}</div>
                      <div className="text-xs font-bold w-12 text-right" style={{ color: gPct === null ? 'transparent' : gain >= 0 ? '#4ade80' : '#f87171' }}>
                        {gPct !== null ? `${gain >= 0 ? '+' : ''}${gPct}%` : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Event history log */}
            {simPhase !== 'idle' && (
              <div className="clay-card p-4">
                <div className="text-xs font-bold text-default-400 uppercase tracking-widest mb-3">📅 Year history</div>
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
                  {eventLog.length === 0 && (
                    <div className="text-xs text-default-500 italic">Events will appear here as years pass.</div>
                  )}
                  {eventLog.map(({ yr, event }) => (
                    <div key={yr} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                      <div className="text-xs font-bold text-default-500 shrink-0 w-12">Yr {yr}</div>
                      {event ? (
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span className="text-sm shrink-0">{event.icon}</span>
                          <div>
                            <div className="text-xs font-semibold leading-tight" style={{ color: event.color }}>{event.title}</div>
                            {event.source && <div className="text-[10px] text-default-500 italic">{event.source}</div>}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-default-500 italic">Quiet year</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RESULTS ────────────────────────────────────────────────────── */}
      {phase === 'results' && (
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="grid grid-cols-[1fr_480px] gap-12 items-start">

            {/* Left: score + actions */}
            <div>
              <div className="text-8xl mb-4">{grade}</div>
              <div className={cn('text-5xl font-bold text-emerald-400 mb-2', pixelify.className)}>{gradeText}</div>
              <div className="text-default-400 text-lg mb-8">
                Your $1,000 grew to <span className="text-emerald-400 font-bold">${Math.round(nw).toLocaleString()}</span> in 10 years
              </div>

              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { val: `$${Math.round(nw).toLocaleString()}`,       lbl: 'Net worth',    color: '#4ade80' },
                  { val: `${change >= 0 ? '+' : ''}${changePct}%`,   lbl: 'Total return', color: '#fbbf24' },
                  { val: `${bestAsset.icon} ${bestAsset.name.split(' ')[0]}`, lbl: 'Best crop', color: '#60a5fa' },
                  {
                    val: beatMarket ? 'Beat it! 📈' : `$${SP500_10YR.toLocaleString()}`,
                    lbl: 'vs. S&P avg',
                    color: beatMarket ? '#4ade80' : '#fbbf24',
                  },
                ].map(s => (
                  <div key={s.lbl} className="clay-card p-5 text-center">
                    <div className="text-xl font-bold mb-1" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-xs text-default-400 uppercase tracking-wide font-semibold">{s.lbl}</div>
                  </div>
                ))}
              </div>

              {/* AI insight */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 mb-4">
                <div className="text-sm font-bold text-blue-400 mb-2">🤖 How did you do?</div>
                {aiLoading ? (
                  <div className="text-sm text-blue-300 animate-pulse">Analyzing your investment journey...</div>
                ) : (
                  <div className="text-sm text-blue-200 leading-relaxed">{aiInsight || '—'}</div>
                )}
              </div>

              <button onClick={restartFarm}
                className={cn('clay-btn bg-emerald-700 hover:bg-emerald-600 text-white px-10 py-4 text-lg font-bold rounded-2xl transition-all hover:-translate-y-0.5', pixelify.className)}>
                Play again →
              </button>
            </div>

            {/* Right: investment split + lessons */}
            <div className="flex flex-col gap-6">
            <div className="clay-card p-6">
              <h3 className={cn('text-sm text-amber-400 mb-4', pixelify.className)}>📊 Final investment split</h3>
              <div className="flex flex-col gap-2">
                {[...ASSETS.map(a => ({ ...a, value: portfolio[a.id] })), { id: 'cash', name: 'Cash', icon: '💵', color: '#fbbf24', value: cash }].map(item => {
                  const pct = Math.round((item.value / nw) * 100)
                  const orig = item.id === 'cash' ? 0 : (origCosts[item.id as AssetId] ?? 0)
                  const gain = item.value - orig
                  const gPct = orig > 0 ? ((gain / orig) * 100).toFixed(1) : null
                  return (
                    <div key={item.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.icon}</span>
                        <div className="text-sm font-semibold text-foreground flex-1">{item.name}</div>
                        <div className="text-sm font-bold">${Math.round(item.value).toLocaleString()}</div>
                        {gPct !== null && (
                          <div className="text-xs font-bold w-14 text-right" style={{ color: gain >= 0 ? '#4ade80' : '#f87171' }}>
                            {gain >= 0 ? '+' : ''}{gPct}%
                          </div>
                        )}
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="clay-card p-6">
              <h3 className={cn('text-sm text-amber-400 mb-5', pixelify.className)}>📖 What the farm taught you</h3>
              <div className="flex flex-col gap-5">
                {[
                  { icon: '🌾', title: 'Boring wins', text: 'The S&P 500 averaged ~10%/yr since 1957. $1,000 invested at 18 becomes ~$452,000 at 65. Start at 30: ~$128,000. The boring choice is the best choice.' },
                  { icon: '💥', title: 'Crashes are real', text: 'The 2008 crash erased 38.5% from the S&P 500. Diversified investors recovered fully by 2013. Those who panicked and sold, didn\'t.' },
                  { icon: '⏰', title: 'Compound interest', text: '$1,000 at 10%/yr becomes $2,594 in 10 years — and $17,449 in 30 years. Every decade of waiting costs you thousands.' },
                  { icon: '🛡️', title: 'Protect what you build', text: 'Building wealth is only half the job. Insurance protects against the unexpected losses that can wipe out years of gains overnight.' },
                ].map(l => (
                  <div key={l.icon} className="flex gap-4">
                    <span className="text-2xl shrink-0">{l.icon}</span>
                    <div>
                      <div className="font-bold text-foreground text-sm mb-1">{l.title}</div>
                      <div className="text-sm text-default-400 leading-relaxed">{l.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
