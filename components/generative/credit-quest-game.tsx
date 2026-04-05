'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@heroui/react'
import { callClaude } from '@/lib/ai/chat'
import { useSFX } from '@/components/audio/use-sfx'

type CreditQuestMood = 'normal' | 'stressed' | 'happy'
type CreditQuestRole = 'ai' | 'user' | 'system'

type CreditQuestEffects = {
  cash?: number
  debt?: number
  followers?: number
  creditScore?: number
}

type CreditQuestOption = {
  text: string
  insight: string
  effects: CreditQuestEffects
}

type CreditQuestTurn = {
  title: string
  question: string
  badge: string
  lesson: string
  mood: CreditQuestMood
  options: CreditQuestOption[]
}

type CreditQuestCampaign = {
  title: string
  intro: string
  endingTitle: string
  endingSummary: string
  turns: CreditQuestTurn[]
}

type CreditQuestMessage = {
  id: string
  role: CreditQuestRole
  text: string
}

type CreditQuestState = {
  day: number
  creditScore: number
  cash: number
  debt: number
  followers: number
  mood: CreditQuestMood
}

const CREDIT_LIMIT = 2000
const DAILY_BASE_INCOME = 20
const FOLLOWER_MULTIPLIER = 0.15

const INITIAL_STATE: CreditQuestState = {
  day: 1,
  creditScore: 650,
  cash: 500,
  debt: 0,
  followers: 100,
  mood: 'normal',
}

const FALLBACK_CAMPAIGN: CreditQuestCampaign = {
  title: 'Credit Quest',
  intro: 'Stream started. Ready to manage your credit?',
  endingTitle: 'Stream Wrap',
  endingSummary:
    'You made it through the run. Smart credit habits kept the channel moving and the score from falling apart.',
  turns: [
    {
      title: 'Mic Trouble',
      question: 'Your microphone is crackling. Do you buy a professional one for $200?',
      badge: 'Gear Upgrade',
      lesson: 'Upgrades can grow the channel, but stacking debt too fast can drag your score down.',
      mood: 'normal',
      options: [
        {
          text: 'Buy on Credit',
          insight:
            'Using credit for business tools can help growth, but utilization matters a lot.',
          effects: { debt: 200, followers: 100, creditScore: -2 },
        },
        {
          text: 'Pay with Cash',
          insight:
            'Cash avoids debt and keeps your score steadier, but your emergency fund shrinks.',
          effects: { cash: -200, followers: 100, creditScore: 5 },
        },
        {
          text: 'Ignore it',
          insight: 'Saving money now may cost you followers if the stream quality stays rough.',
          effects: { followers: -20 },
        },
      ],
    },
    {
      title: 'Sketchy Sponsor',
      question: 'A sponsor offers you $500 to promote a sketchy site. Do you take it?',
      badge: 'Brand Decision',
      lesson: 'Fast cash can solve a short-term problem, but reputation affects long-term income.',
      mood: 'stressed',
      options: [
        {
          text: 'Take Money',
          insight: 'You get cash now, but follower trust usually takes a hit.',
          effects: { cash: 500, followers: -50 },
        },
        {
          text: 'Decline',
          insight: 'Turning it down protects your brand and keeps the channel healthier long term.',
          effects: { followers: 20 },
        },
      ],
    },
    {
      title: 'Surprise Bill',
      question: 'A surprise bill lands in your inbox. Do you dip into savings or put it on credit?',
      badge: 'Emergency',
      lesson:
        'The best answer depends on your buffer. Savings can protect your score, but only if you have room.',
      mood: 'stressed',
      options: [
        {
          text: 'Use Cash',
          insight: 'Paying from cash avoids new debt and keeps your utilization low.',
          effects: { cash: -150, creditScore: 4 },
        },
        {
          text: 'Use Credit',
          insight: 'Credit keeps cash on hand, but debt can snowball if this becomes a habit.',
          effects: { debt: 150, creditScore: -3 },
        },
      ],
    },
    {
      title: 'Subscriber Boom',
      question:
        'A clip goes viral and new followers flood in. Do you save the extra cash or upgrade your setup?',
      badge: 'Momentum',
      lesson: 'Good timing can create a rare chance to strengthen both cash flow and your channel.',
      mood: 'happy',
      options: [
        {
          text: 'Save the Windfall',
          insight: 'Saving the gain builds a buffer and helps keep your credit future flexible.',
          effects: { cash: 250, followers: 40, creditScore: 4 },
        },
        {
          text: 'Upgrade Everything',
          insight:
            'Upgrading can compound growth, but it is safer when debt is already under control.',
          effects: { cash: -100, followers: 80, creditScore: 1 },
        },
      ],
    },
    {
      title: 'Weekend Rush',
      question:
        'A weekend opportunity appears. Do you spend on promotion or keep the money for bills?',
      badge: 'Growth',
      lesson: 'Growth spends can pay off, but only if your balance can handle the risk.',
      mood: 'normal',
      options: [
        {
          text: 'Run Ads',
          insight: 'Promotions may grow followers, but they make your cash tighter right away.',
          effects: { cash: -180, followers: 55, creditScore: -1 },
        },
        {
          text: 'Stay Lean',
          insight: 'Skipping the spend protects your cushion and keeps the score safer.',
          effects: { creditScore: 3 },
        },
      ],
    },
    {
      title: 'Emergency Repair',
      question: 'Your setup breaks again. Do you finance the repair or wait until next month?',
      badge: 'Pressure',
      lesson:
        'Sometimes debt is the fastest fix, but every new balance makes the next bill harder.',
      mood: 'stressed',
      options: [
        {
          text: 'Finance It',
          insight: 'You keep streaming, but debt grows and utilization climbs.',
          effects: { debt: 250, followers: 25, creditScore: -4 },
        },
        {
          text: 'Wait It Out',
          insight: 'You save money now, but the delay can hurt audience momentum.',
          effects: { followers: -15, creditScore: 2 },
        },
      ],
    },
    {
      title: 'Sponsor Comeback',
      question:
        'A better sponsor wants a clean partnership. Do you take the deal or protect your brand?',
      badge: 'Recovery',
      lesson: 'A strong brand can be more valuable than a quick payout when the long game matters.',
      mood: 'happy',
      options: [
        {
          text: 'Take the Deal',
          insight: 'This gives you cash and helps you catch up if you have been running lean.',
          effects: { cash: 400, followers: 30 },
        },
        {
          text: 'Protect the Brand',
          insight: 'You keep trust high, which can support your score and future income.',
          effects: { followers: 20, creditScore: 3 },
        },
      ],
    },
  ],
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatMoney(value: number) {
  return `$${Math.max(0, Math.round(value))}`
}

function deriveMood(state: CreditQuestState): CreditQuestMood {
  if (state.debt > 1200 || state.creditScore < 550) return 'stressed'
  if (state.creditScore > 750 && state.debt < 200) return 'happy'
  return 'normal'
}

function cleanJsonPayload(raw: string) {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return trimmed.slice(start, end + 1)
}

function normalizeCampaign(raw: string): CreditQuestCampaign | null {
  try {
    const json = cleanJsonPayload(raw)
    if (!json) return null

    const parsed = JSON.parse(json) as Partial<CreditQuestCampaign> & {
      turns?: Array<
        Partial<CreditQuestTurn> & {
          options?: Array<Partial<CreditQuestOption> & { effects?: CreditQuestEffects }>
        }
      >
    }

    if (!Array.isArray(parsed.turns) || parsed.turns.length < 4) return null

    const turns = parsed.turns.slice(0, 8).map((turn) => {
      const options = (turn.options || [])
        .slice(0, 3)
        .map((option) => ({
          text: String(option.text || '').trim(),
          insight: String(
            option.insight || 'A reasonable tradeoff with credit consequences.'
          ).trim(),
          effects: {
            cash: clamp(Number(option.effects?.cash ?? 0), -250, 500),
            debt: clamp(Number(option.effects?.debt ?? 0), -250, 300),
            followers: clamp(Number(option.effects?.followers ?? 0), -60, 120),
            creditScore: clamp(Number(option.effects?.creditScore ?? 0), -15, 15),
          },
        }))
        .filter((option) => option.text.length > 0)

      const mood: CreditQuestMood =
        turn.mood === 'stressed' || turn.mood === 'happy' ? turn.mood : 'normal'

      return {
        title: String(turn.title || 'Credit Quest').trim(),
        question: String(turn.question || '').trim(),
        badge: String(turn.badge || 'Financial Choice').trim(),
        lesson: String(
          turn.lesson || 'Every choice changes cash, followers, and credit health.'
        ).trim(),
        mood,
        options: options.length >= 2 ? options : FALLBACK_CAMPAIGN.turns[0].options,
      }
    })

    return {
      title: String(parsed.title || 'Credit Quest').trim(),
      intro: String(parsed.intro || FALLBACK_CAMPAIGN.intro).trim(),
      endingTitle: String(parsed.endingTitle || FALLBACK_CAMPAIGN.endingTitle).trim(),
      endingSummary: String(parsed.endingSummary || FALLBACK_CAMPAIGN.endingSummary).trim(),
      turns,
    }
  } catch {
    return null
  }
}

function applyChoice(base: CreditQuestState, option: CreditQuestOption): CreditQuestState {
  const nextCash = Math.max(0, base.cash + (option.effects.cash ?? 0))
  const nextDebt = Math.max(0, base.debt + (option.effects.debt ?? 0))
  const nextFollowers = Math.max(0, base.followers + (option.effects.followers ?? 0))
  let nextScore = base.creditScore + (option.effects.creditScore ?? 0)

  const utilization = nextDebt / CREDIT_LIMIT
  if (utilization > 0.3) nextScore -= 5
  if (utilization > 0.6) nextScore -= 5

  nextScore = clamp(nextScore, 300, 850)

  const nextState = {
    ...base,
    cash: nextCash,
    debt: nextDebt,
    followers: nextFollowers,
    creditScore: nextScore,
    mood: 'normal' as CreditQuestMood,
  }

  nextState.mood = deriveMood(nextState)
  return nextState
}

function buildCampaignPrompt() {
  return `You are generating a complete interactive browser mini-game called Credit Quest.
Create the entire campaign up front so the game does not need more AI calls during play.

Return ONLY valid JSON with this shape:
{
  "title": "Credit Quest",
  "intro": "one short welcome sentence",
  "endingTitle": "short ending title",
  "endingSummary": "2-3 sentence ending summary",
  "turns": [
    {
      "title": "short title",
      "question": "one sentence question",
      "badge": "short label",
      "lesson": "one sentence lesson",
      "mood": "normal" | "stressed" | "happy",
      "options": [
        {
          "text": "button label",
          "insight": "one sentence explanation",
          "effects": { "cash": number, "debt": number, "followers": number, "creditScore": number }
        }
      ]
    }
  ]
}

Rules:
- Generate exactly 8 turns.
- Create 2 or 3 options per turn.
- Keep the story centered on a livestream creator managing cash, debt, followers, and credit score. Thus half of the questions need to be about purchasing equipment on either credit or cash.
- Include a mix of good and bad choices, some growth moments, and at least one stressful bill-like moment.
- Keep cash effects between -250 and 500.
- Keep debt effects between -250 and 300.
- Keep followers effects between -20 and 80.
- Keep creditScore effects between -15 and 15.
- Do not use markdown fences.
- Do not mention that the game needs future AI calls.
- Make the tone warm, playful, and practical.`
}

function buildFallbackCampaign(): CreditQuestCampaign {
  return FALLBACK_CAMPAIGN
}

export function CreditQuestGame() {
  const { play, SFX } = useSFX()
  const [campaign, setCampaign] = useState<CreditQuestCampaign | null>(null)
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0)
  const [gameState, setGameState] = useState<CreditQuestState>(INITIAL_STATE)
  const [messages, setMessages] = useState<CreditQuestMessage[]>([])
  const [insightText, setInsightText] = useState('Preparing your campaign...')
  const [loadingCampaign, setLoadingCampaign] = useState(true)
  const [bill, setBill] = useState<{ fullAmount: number; minimumAmount: number } | null>(null)
  const [queuedTurnIndex, setQueuedTurnIndex] = useState<number | null>(null)
  const [turnLocked, setTurnLocked] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const messageId = useRef(1)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const chatLogRef = useRef<HTMLDivElement | null>(null)
  const messagesRef = useRef<CreditQuestMessage[]>([])
  const currentTurn = campaign?.turns[currentTurnIndex] ?? null

  function syncMessages(nextMessages: CreditQuestMessage[]) {
    messagesRef.current = nextMessages
    setMessages(nextMessages)
  }

  function addMessage(role: CreditQuestRole, text: string) {
    const nextMessages = [
      ...messagesRef.current.slice(-18),
      { id: `msg-${messageId.current++}`, role, text },
    ]
    syncMessages(nextMessages)
  }

  function startTurn(index: number, state: CreditQuestState, nextCampaign = campaign) {
    if (!nextCampaign || index >= nextCampaign.turns.length) {
      setGameOver(true)
      setTurnLocked(true)
      setBill(null)
      if (nextCampaign) {
        addMessage('system', nextCampaign.endingTitle)
        addMessage('ai', nextCampaign.endingSummary)
      }
      return
    }

    const turn = nextCampaign.turns[index]
    setCurrentTurnIndex(index)
    setGameState(state)
    setBill(null)
    setQueuedTurnIndex(null)
    setGameOver(false)
    setTurnLocked(false)
    setInsightText(turn.lesson)
    addMessage('ai', turn.question)
  }

  async function initializeCampaign() {
    setLoadingCampaign(true)
    setTurnLocked(true)
    setBill(null)
    setQueuedTurnIndex(null)
    setGameOver(false)
    setGameState(INITIAL_STATE)
    setCurrentTurnIndex(0)
    setMessages([])
    messagesRef.current = []
    messageId.current = 1
    setInsightText('Preparing your campaign...')

    try {
      const raw = await callClaude(buildCampaignPrompt())
      const nextCampaign = normalizeCampaign(raw) ?? buildFallbackCampaign()
      setCampaign(nextCampaign)
      syncMessages([
        { id: `msg-${messageId.current++}`, role: 'ai', text: nextCampaign.intro },
        {
          id: `msg-${messageId.current++}`,
          role: 'ai',
          text: nextCampaign.turns[0]?.question ?? 'Ready?',
        },
      ])
      setInsightText(nextCampaign.turns[0]?.lesson ?? nextCampaign.intro)
      setGameState(INITIAL_STATE)
      setCurrentTurnIndex(0)
      setGameOver(false)
      setTurnLocked(false)
      play(SFX.MILESTONE)
    } catch {
      const nextCampaign = buildFallbackCampaign()
      setCampaign(nextCampaign)
      syncMessages([
        { id: `msg-${messageId.current++}`, role: 'ai', text: nextCampaign.intro },
        {
          id: `msg-${messageId.current++}`,
          role: 'ai',
          text: nextCampaign.turns[0]?.question ?? 'Ready?',
        },
      ])
      setInsightText(nextCampaign.turns[0]?.lesson ?? nextCampaign.intro)
      setGameState(INITIAL_STATE)
      setCurrentTurnIndex(0)
      setGameOver(false)
      setTurnLocked(false)
      play(SFX.MILESTONE)
    } finally {
      setLoadingCampaign(false)
    }
  }

  useEffect(() => {
    void initializeCampaign()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = chatLogRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, currentTurnIndex, bill, loadingCampaign, gameOver])

  function processEndOfDay(nextState: CreditQuestState, turnIndex: number) {
    const earnings = Math.floor(DAILY_BASE_INCOME + nextState.followers * FOLLOWER_MULTIPLIER)
    const afterIncome: CreditQuestState = {
      ...nextState,
      day: nextState.day + 1,
      cash: nextState.cash + earnings,
      mood: deriveMood(nextState),
    }

    setGameState(afterIncome)
    addMessage('system', `Day ${nextState.day} ended. +${formatMoney(earnings)} earned.`)

    const billDue = afterIncome.day % 7 === 1 && afterIncome.day > 1 && afterIncome.debt > 0
    if (billDue) {
      const minimumAmount = Math.max(25, Math.floor(afterIncome.debt * 0.1) + 25)
      setBill({
        fullAmount: afterIncome.debt,
        minimumAmount,
      })
      setQueuedTurnIndex(turnIndex + 1)
      addMessage('ai', `The weekly credit bill of ${formatMoney(afterIncome.debt)} is due.`)
      setInsightText(
        `Weekly bill due: ${formatMoney(afterIncome.debt)}. Paying in full helps your score more.`
      )
      setTurnLocked(false)
      return
    }

    startTurn(turnIndex + 1, afterIncome, campaign ?? undefined)
  }

  function handleChoice(option: CreditQuestOption) {
    if (turnLocked || !currentTurn || gameOver || !campaign) return

    setTurnLocked(true)
    addMessage('user', option.text)
    setInsightText(option.insight)

    const nextState = applyChoice(gameState, option)
    setGameState(nextState)

    play(option.effects.debt && option.effects.debt > 0 ? SFX.CRISIS_START : SFX.GAME_CORRECT)

    setTimeout(() => {
      processEndOfDay(nextState, currentTurnIndex)
    }, 550)
  }

  function payBill(mode: 'full' | 'min') {
    if (!bill || queuedTurnIndex === null || !campaign || turnLocked) return

    setTurnLocked(true)
    const desiredAmount = mode === 'full' ? bill.fullAmount : bill.minimumAmount
    const actualPaid = Math.min(gameState.cash, desiredAmount)
    const nextDebt = Math.max(0, gameState.debt - actualPaid)
    const nextCash = Math.max(0, gameState.cash - actualPaid)
    const nextScore = clamp(gameState.creditScore + (mode === 'full' ? 15 : 2), 300, 850)

    const nextState: CreditQuestState = {
      ...gameState,
      cash: nextCash,
      debt: nextDebt,
      creditScore: nextScore,
      mood: deriveMood({
        ...gameState,
        cash: nextCash,
        debt: nextDebt,
        creditScore: nextScore,
      }),
    }

    setGameState(nextState)
    setBill(null)
    addMessage(
      'user',
      mode === 'full'
        ? `Full Pay (${formatMoney(bill.fullAmount)})`
        : `Min Pay (${formatMoney(bill.minimumAmount)})`
    )
    addMessage(
      'system',
      actualPaid > 0
        ? `You paid ${formatMoney(actualPaid)} toward the bill.`
        : 'You could not make a payment this week, so the debt rolls forward.'
    )
    setInsightText(
      mode === 'full'
        ? 'Paying in full minimizes interest and maximizes your credit score boost.'
        : 'Paying only the minimum keeps cash on hand but slows down credit growth.'
    )
    play(mode === 'full' ? SFX.GAME_WIN : SFX.GAME_CORRECT)

    const nextIndex = queuedTurnIndex
    setQueuedTurnIndex(null)
    if (nextIndex >= campaign.turns.length) {
      setGameOver(true)
      addMessage('system', campaign.endingTitle)
      addMessage('ai', campaign.endingSummary)
      setTurnLocked(true)
      return
    }

    startTurn(nextIndex, nextState, campaign)
  }

  const dailyIncome = Math.floor(DAILY_BASE_INCOME + gameState.followers * FOLLOWER_MULTIPLIER)
  const scoreColor =
    gameState.creditScore >= 740
      ? '#2e7d32'
      : gameState.creditScore >= 670
        ? '#8b5e3c'
        : gameState.creditScore >= 580
          ? '#ef6c00'
          : '#d32f2f'
  const creditStatus =
    gameState.creditScore >= 740
      ? 'Excellent'
      : gameState.creditScore >= 670
        ? 'Good'
        : gameState.creditScore >= 580
          ? 'Fair'
          : 'Poor'

  const moodLabel = {
    normal: 'NORMAL',
    stressed: 'STRESSED',
    happy: 'THRIVING',
  }[gameState.mood]

  const moodImage = `/assets/${gameState.mood}.png`
  const panelBackground = '/assets/background.png'

  return (
    <div className="grid h-[75vh] gap-6 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
      <div
        className="clay-card relative flex flex-col overflow-hidden border-4 border-white p-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 248, 240, 0.32), rgba(233, 214, 198, 0.12)), url(${panelBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute left-5 top-5 rounded-full bg-[#8b5e3c] px-4 py-2 text-sm font-black text-white shadow-lg">
          DAY {gameState.day}
        </div>

        <div className="mt-12 flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <Image
            src={moodImage}
            alt={gameState.mood}
            width={280}
            height={280}
            className="h-auto w-[85%] max-w-[280px] drop-shadow-[0_10px_15px_rgba(0,0,0,0.1)]"
          />
          <div className="rounded-full bg-white px-4 py-2 text-sm font-black tracking-[0.2em] text-[#5d4037] shadow-md">
            {moodLabel}
          </div>
        </div>
      </div>

      <div
        className="clay-card flex h-[75vh] min-h-0 flex-col overflow-hidden p-0"
        style={{ backgroundColor: '#ead4b8' }}
      >
        <div className="border-b border-white/70 bg-white/40 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8b5e3c]">
                {currentTurn ? currentTurn.badge : 'AI Story Mode'}
              </p>
              <h3 className="mt-1 text-lg font-black text-[#4d3428]">
                {loadingCampaign
                  ? 'Generating campaign...'
                  : currentTurn
                    ? currentTurn.title
                    : (campaign?.title ?? 'Credit Quest')}
              </h3>
            </div>
            <div className="rounded-full bg-[#8b5e3c] px-3 py-1 text-xs font-bold text-white">
              Daily income {formatMoney(dailyIncome)}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            id="chat-container"
            ref={chatLogRef}
            className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
            style={{
              scrollbarGutter: 'stable',
              scrollbarWidth: 'thin',
            }}
          >
            <div className="flex flex-col gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={[
                    'max-w-[85%] rounded-3xl px-4 py-3 text-sm font-semibold leading-6 shadow-inner',
                    message.role === 'ai'
                      ? 'self-start rounded-bl-sm bg-[#fffcf9] text-[#5d4037]'
                      : message.role === 'user'
                        ? 'self-end rounded-br-sm bg-[#8b5e3c] text-white shadow-none'
                        : 'self-center rounded-full bg-[#efebe9] px-4 py-2 text-xs text-[#795548]',
                  ].join(' ')}
                >
                  {message.text}
                </div>
              ))}

              {loadingCampaign && (
                <div className="self-start rounded-3xl bg-white px-4 py-3 text-sm font-semibold text-[#5d4037] shadow-inner">
                  AI is writing the full campaign...
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </div>

          <div className="border-t border-[#e7d3be] bg-[#fff8ef] px-5 py-4">
            {gameOver ? (
              <div className="space-y-3">
                <div className="rounded-3xl border-2 border-dashed border-[#d7ccc8] bg-white px-4 py-4">
                  <p className="text-sm font-black text-[#8b5e3c]">
                    {campaign?.endingTitle ?? 'Run Complete'}
                  </p>
                  <p className="mt-1 text-sm text-[#6d4c41]">
                    {campaign?.endingSummary ?? 'You finished the campaign.'}
                  </p>
                </div>
                <Button
                  onPress={initializeCampaign}
                  variant="primary"
                  className="clay-btn bg-[#8b5e3c] text-white"
                >
                  Play Again
                </Button>
              </div>
            ) : bill ? (
              <div className="space-y-3">
                <div className="rounded-3xl border-2 border-dashed border-[#d7ccc8] bg-white px-4 py-4">
                  <p className="text-sm font-black text-[#8b5e3c]">Weekly Bill</p>
                  <p className="mt-1 text-sm text-[#6d4c41]">
                    The weekly credit bill is due. You can pay in full or make the minimum payment.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onPress={() => payBill('full')}
                    variant="primary"
                    className="clay-btn bg-[#8b5e3c] text-white"
                  >
                    Full Pay ({formatMoney(bill.fullAmount)})
                  </Button>
                  <Button onPress={() => payBill('min')} variant="secondary" className="clay-btn">
                    Min Pay ({formatMoney(bill.minimumAmount)})
                  </Button>
                </div>
              </div>
            ) : currentTurn ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  {currentTurn.options.map((option, index) => (
                    <Button
                      key={`${option.text}-${index}`}
                      onPress={() => handleChoice(option)}
                      isDisabled={turnLocked || loadingCampaign}
                      variant="primary"
                      className="clay-btn bg-[#8b5e3c] text-white"
                    >
                      {option.text}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl bg-[#fff9f2] px-4 py-4 text-sm text-[#6d4c41] shadow-inner">
                {loadingCampaign ? 'Waiting for AI...' : 'Preparing your next financial decision.'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="clay-card flex flex-col gap-4 overflow-hidden p-5">
        <div className="rounded-3xl bg-white px-4 py-4 shadow-inner">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#8b5e3c]">
            Credit Score
          </div>
          <div
            className="mx-auto my-4 flex h-28 w-28 items-center justify-center rounded-full border-[10px] text-3xl font-black"
            style={{ borderColor: scoreColor }}
          >
            {Math.floor(gameState.creditScore)}
          </div>
          <div className="text-center text-sm font-bold" style={{ color: scoreColor }}>
            {creditStatus}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-inner">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b5e3c]">Cash</div>
            <div className="mt-1 text-sm font-black text-[#4d3428]">
              {formatMoney(gameState.cash)}
            </div>
          </div>
          <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-inner">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b5e3c]">Debt</div>
            <div className="mt-1 text-sm font-black text-[#4d3428]">
              {formatMoney(gameState.debt)}
            </div>
          </div>
          <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-inner">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b5e3c]">
              Income
            </div>
            <div className="mt-1 text-sm font-black text-[#4d3428]">{formatMoney(dailyIncome)}</div>
          </div>
          <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-inner">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#8b5e3c]">
              Followers
            </div>
            <div className="mt-1 text-sm font-black text-[#4d3428]">{gameState.followers}</div>
          </div>
        </div>

        <div className="self-start inline-flex max-w-[360px] flex-col items-center rounded-[28px] border-2 border-dashed border-[#d7ccc8] bg-[#fffdfa] px-4 py-4 text-sm leading-6 text-[#6d4c41] shadow-inner">
          <h4 className="mb-2 text-base font-black text-center text-[#8b5e3c]">AI Insights</h4>
          <p className="w-full text-justify">{insightText}</p>
        </div>
      </div>
    </div>
  )
}
