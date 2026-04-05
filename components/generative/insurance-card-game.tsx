'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { callClaude } from '@/lib/ai/chat'

type Screen =
  | 'screen-title'
  | 'screen-persona'
  | 'screen-protection'
  | 'screen-myth'
  | 'screen-event'
  | 'screen-result'
  | 'screen-end'

type Modal = 'none' | 'how' | 'guide'
type ChartMode = 'metric' | 'plan'
type MythPick = boolean | null | 'pending'

type Persona = {
  id: string
  emoji: string
  name: string
  desc: string
  budget: number
  savings: number
  riskBoost: string[]
  color: string
}

type Tier = {
  id: string
  label: string
  cost: number
  deductible?: number
  payoutRate?: number
  quick: string
  pitfall: string
  whatItIs: string
  teenTip: string
  savingsBoost?: number
  liability?: boolean
  collision?: boolean
  comprehensive?: boolean
  uninsured?: boolean
  urgentCare?: boolean
  belongings?: boolean
  dental?: boolean
  vision?: boolean
}

type Group = {
  id: string
  category: string
  icon: string
  name: string
  summary: string
  tiers: Tier[]
}

type EventCard = {
  id: string
  emoji: string
  title: string
  desc: string
  totalCost: number
  type: string
  lesson: string
  betterOption: string
}

type MythCard = {
  id: string
  statement: string
  answer: boolean
  explanation: string
  tags: string[]
}

type PlanMap = Record<string, string>

type Outcome = {
  totalCost: number
  insurerPays: number
  youPay: number
  endingSavings: number
  addedDebt: number
  resultType: 'good' | 'neutral' | 'bad'
  resultTitle: string
  resultIcon: string
  consequence: string
  usedTierName: string
  relevantGroup: string
}

type Coach = {
  summary: string
  riskLevel: number
  planGrade: string
  gradeTone: 'good' | 'mid' | 'bad'
  insuranceShare: number
  playerShare: number
  mainGap: string
  strongestPoint: string
  moneyImpact: string
  nextMoveLabel: string
  nextMoveText: string
  budgetShare: number
  monthlyCost: number
  extraMonthlyCost: number
  estimatedDebtReduction: number
  stateFarmLabel: string
  stateFarmNote: string
  stateFarmCta: string
  stateFarmUrl: string
  sourceLabel: string
}

type Comparison = {
  key: string
  label: string
  result: {
    avgDebt: number
    avgSavings: number
    avgOutOfPocket: number
    monthlyCost: number
  }
}

type GameState = {
  persona: Persona | null
  selectedPlans: PlanMap
  monthlySpent: number
  savings: number
  debt: number
  round: number
  totalRounds: number
  currentMyth: MythCard | null
  currentMythSet: MythCard[]
  currentMythIndex: number
  currentEvent: EventCard | null
  mythCorrect: number
  mythWrong: number
  mythSelection: MythPick
  lessonsLearned: string[]
  initialSavings: number
  activeCategory: string
  usedMythIds: string[]
  usedEventIds: string[]
  lastOutcome: Outcome | null
  coachAdvice: Coach | null
  coachLoading: boolean
  coachAudioLoading: boolean
  currentCoachSpeechText: string
  endChartMode: ChartMode
  endComparisons: Comparison[] | null
}

const PERSONAS: Persona[] = [
  {
    id: 'first-car',
    emoji: '🚗',
    name: 'First Car Teen',
    desc: 'Just got your documents & license and your first used car.',
    budget: 120,
    savings: 700,
    riskBoost: ['auto'],
    color: '#8cc5f0',
  },
  {
    id: 'dorm-student',
    emoji: '🎒',
    name: 'Dorm Student',
    desc: 'Living in campus housing, managing everything on your own.',
    budget: 70,
    savings: 300,
    riskBoost: ['renters', 'health'],
    color: '#f5a374',
  },
  {
    id: 'first-apartment',
    emoji: '🏠',
    name: 'First Apartment Renter',
    desc: 'Moved out, paying rent, figuring out adulthood.',
    budget: 90,
    savings: 500,
    riskBoost: ['renters', 'health'],
    color: '#8dd9a0',
  },
  {
    id: 'part-time',
    emoji: '💼',
    name: 'Part-Time Worker',
    desc: 'Juggling school and work, no employer benefits.',
    budget: 80,
    savings: 400,
    riskBoost: ['health', 'auto'],
    color: '#f5d97a',
  },
  {
    id: 'teen-athlete',
    emoji: '⚽',
    name: 'Teen Athlete',
    desc: 'Competing regularly, higher chance of injuries.',
    budget: 100,
    savings: 550,
    riskBoost: ['health'],
    color: '#f0a0c0',
  },
]

const INSURANCE_GROUPS: Group[] = [
  {
    id: 'auto',
    category: 'auto',
    icon: '🚗',
    name: 'Auto Insurance',
    summary:
      "This group changes whether your car, someone else's car, theft, and uninsured-driver accidents are paid for.",
    tiers: [
      {
        id: 'none',
        label: 'No Auto Plan',
        cost: 0,
        deductible: 999999,
        payoutRate: 0,
        liability: false,
        collision: false,
        comprehensive: false,
        uninsured: false,
        quick: 'You save money now, but any car-related event can hit you hard.',
        pitfall: 'No help for crashes, theft, glass, or uninsured drivers.',
        whatItIs: 'No monthly cost, but no car-related safety net either.',
        teenTip: 'This looks cheapest until a single incident lands.',
      },
      {
        id: 'minimum',
        label: 'Minimum Liability',
        cost: 20,
        deductible: 900,
        payoutRate: 0.35,
        liability: true,
        collision: false,
        comprehensive: false,
        uninsured: false,
        quick: 'Covers damage you cause to other people, but leaves your own car exposed.',
        pitfall: 'Many drivers assume this protects their own car too. It does not.',
        whatItIs: 'A cheap starter plan built around basic liability only.',
        teenTip: 'Good for learning the difference between legal minimum and real protection.',
      },
      {
        id: 'standard',
        label: 'Standard Auto',
        cost: 45,
        deductible: 500,
        payoutRate: 0.65,
        liability: true,
        collision: true,
        comprehensive: false,
        uninsured: true,
        quick:
          'A middle-ground plan that helps with crashes and uninsured drivers, but not theft or broken glass.',
        pitfall: 'Still weak against non-crash events like stolen cars or windshield damage.',
        whatItIs: 'A more balanced plan for common driving risks.',
        teenTip: 'This is often the smart middle choice for teen drivers.',
      },
      {
        id: 'strong',
        label: 'Full Auto Shield',
        cost: 70,
        deductible: 250,
        payoutRate: 0.9,
        liability: true,
        collision: true,
        comprehensive: true,
        uninsured: true,
        quick:
          'Strongest protection for crashes, theft, weather, glass, and uninsured-driver problems.',
        pitfall: 'Best protection, but it takes more of your monthly budget.',
        whatItIs: 'A fuller auto plan with broad protection and lower out-of-pocket cost.',
        teenTip: 'Costs more each month, but can slash debt risk after a big event.',
      },
    ],
  },
  {
    id: 'health',
    category: 'health',
    icon: '❤️',
    name: 'Health Insurance',
    summary:
      'This group changes how badly urgent care and medical surprise bills affect your savings.',
    tiers: [
      {
        id: 'none',
        label: 'No Health Plan',
        cost: 0,
        deductible: 999999,
        payoutRate: 0,
        urgentCare: false,
        quick: 'No monthly cost, but you pay the full bill when you need care.',
        pitfall:
          'Young people often skip health coverage because they feel healthy. Bills still happen.',
        whatItIs: 'No medical protection at all.',
        teenTip: 'One random injury can cost more than months of premiums.',
      },
      {
        id: 'bare',
        label: 'Bare Bones Plan',
        cost: 10,
        deductible: 1000,
        payoutRate: 0.35,
        urgentCare: true,
        quick: 'Very cheap, but leaves a big deductible and weak payout.',
        pitfall: 'Having insurance is not the same as being well protected.',
        whatItIs: 'An entry-level medical plan with major gaps.',
        teenTip: 'Useful for showing why the cheapest plan is not always enough.',
      },
      {
        id: 'standard',
        label: 'Standard Plan',
        cost: 30,
        deductible: 500,
        payoutRate: 0.7,
        urgentCare: true,
        quick: 'Better balance between monthly cost and protection.',
        pitfall: 'Still may leave a meaningful bill after care.',
        whatItIs: 'A middle-tier health option for more realistic support.',
        teenTip: 'Often a smart learning choice because it shows trade-offs clearly.',
      },
      {
        id: 'strong',
        label: 'Strong Plan',
        cost: 50,
        deductible: 200,
        payoutRate: 0.9,
        urgentCare: true,
        quick: 'Highest cost, but much lower pain when something medical happens.',
        pitfall: 'The monthly price can crowd out other protection if your budget is tight.',
        whatItIs: 'A strong health plan with lower out-of-pocket shock.',
        teenTip: 'Great for athletes and anyone who wants smaller surprise bills.',
      },
    ],
  },
  {
    id: 'renters',
    category: 'renters',
    icon: '🏠',
    name: 'Renters Insurance',
    summary:
      'This group protects your stuff in dorms or apartments, especially after theft, leaks, or fire damage.',
    tiers: [
      {
        id: 'none',
        label: 'No Renters Plan',
        cost: 0,
        deductible: 999999,
        payoutRate: 0,
        belongings: false,
        quick: 'No monthly cost, but your belongings are on your own.',
        pitfall: "Your landlord's insurance is for the building, not your belongings.",
        whatItIs: 'No protection for personal belongings.',
        teenTip: 'This is the easiest coverage to underestimate.',
      },
      {
        id: 'basic',
        label: 'Basic Renters',
        cost: 8,
        deductible: 500,
        payoutRate: 0.55,
        belongings: true,
        quick: 'A low-cost start that helps, but leaves more uncovered loss.',
        pitfall: 'Cheap protection can still leave a painful gap after a theft or leak.',
        whatItIs: 'A basic belongings plan for small monthly cost.',
        teenTip: 'Good first step if you only have room for one low-cost protection.',
      },
      {
        id: 'standard',
        label: 'Standard Renters',
        cost: 14,
        deductible: 250,
        payoutRate: 0.8,
        belongings: true,
        quick: 'A strong value plan for electronics, clothing, and apartment stuff.',
        pitfall: 'It still does not insure the building itself.',
        whatItIs: 'A better-level renters plan with stronger payouts.',
        teenTip: 'Great fit for dorms and first apartments.',
      },
      {
        id: 'premium',
        label: 'High-Value Renters',
        cost: 22,
        deductible: 100,
        payoutRate: 0.92,
        belongings: true,
        quick: 'Best for people with more expensive stuff and low tolerance for loss.',
        pitfall: 'Great coverage, but maybe more than you need if your budget is tiny.',
        whatItIs: 'A stronger renters option for expensive belongings.',
        teenTip: 'Makes sense if you have a laptop, tablet, gaming gear, and other pricey stuff.',
      },
    ],
  },
  {
    id: 'dental',
    category: 'health',
    icon: '🦷',
    name: 'Dental Coverage',
    summary: 'This group handles dental bills that normal health plans often leave out.',
    tiers: [
      {
        id: 'none',
        label: 'No Dental Plan',
        cost: 0,
        deductible: 999999,
        payoutRate: 0,
        dental: false,
        quick: 'No monthly cost, but dental emergencies come straight from your pocket.',
        pitfall: 'Many people think health insurance will cover teeth. Often it does not.',
        whatItIs: 'No specific dental protection.',
        teenTip: 'You usually do not miss this until a painful bill arrives.',
      },
      {
        id: 'basic',
        label: 'Basic Dental',
        cost: 10,
        deductible: 400,
        payoutRate: 0.5,
        dental: true,
        quick: 'Affordable help for dental bills, but still leaves a bigger share for you.',
        pitfall: 'Helps, but major procedures can still hurt financially.',
        whatItIs: 'An entry dental plan with moderate help.',
        teenTip: 'Useful if you want some help without spending much.',
      },
      {
        id: 'strong',
        label: 'Strong Dental',
        cost: 20,
        deductible: 150,
        payoutRate: 0.82,
        dental: true,
        quick: 'Higher monthly cost, but much better for bigger procedures.',
        pitfall: 'May feel optional until you need a root canal fast.',
        whatItIs: 'A better dental plan for more serious treatments.',
        teenTip: 'Best for players who want less risk from surprise dental work.',
      },
    ],
  },
  {
    id: 'vision',
    category: 'health',
    icon: '👓',
    name: 'Vision Coverage',
    summary:
      'This group helps with eye exams, broken glasses, and some vision-related costs that normal health plans may not handle well.',
    tiers: [
      {
        id: 'none',
        label: 'No Vision Plan',
        cost: 0,
        deductible: 999999,
        payoutRate: 0,
        vision: false,
        quick: 'No monthly cost, but glasses, frames, and eye-care bills are fully on you.',
        pitfall:
          'A lot of people assume regular health insurance handles glasses and vision care. Often it does not.',
        whatItIs: 'No specific vision protection.',
        teenTip: 'This matters most if you already wear glasses or contacts.',
      },
      {
        id: 'basic',
        label: 'Basic Vision',
        cost: 8,
        deductible: 120,
        payoutRate: 0.55,
        vision: true,
        quick:
          'A lower-cost plan that helps with routine vision costs and smaller gear replacements.',
        pitfall: 'Cheap vision coverage can still leave you paying a decent chunk for new glasses.',
        whatItIs: 'An entry vision plan for exams and basic help with eyewear.',
        teenTip: 'Useful if you want some help without spending much every month.',
      },
      {
        id: 'strong',
        label: 'Strong Vision',
        cost: 16,
        deductible: 40,
        payoutRate: 0.88,
        vision: true,
        quick:
          'Better monthly cost, but much less pain if glasses break or you need eye-care support.',
        pitfall: 'Feels skippable until you suddenly need new glasses right away.',
        whatItIs:
          'A stronger vision plan with better replacement support and lower out-of-pocket cost.',
        teenTip: 'Best for players who depend on glasses or contacts every day.',
      },
    ],
  },
  {
    id: 'savings',
    category: 'savings',
    icon: '💰',
    name: 'Emergency Fund',
    summary:
      'This is not insurance, but it reduces how often deductibles and uncovered gaps turn into debt.',
    tiers: [
      {
        id: 'none',
        label: 'No Savings Boost',
        cost: 0,
        savingsBoost: 0,
        quick: 'You rely only on your starting savings.',
        pitfall: 'Even strong insurance often leaves some bill for you.',
        whatItIs: 'No added cash buffer.',
        teenTip: 'Insurance plus savings is often better than only one of them.',
      },
      {
        id: 'small',
        label: 'Small Cushion',
        cost: 10,
        savingsBoost: 200,
        quick: 'A modest buffer for deductibles and small emergencies.',
        pitfall: 'Helps, but not enough for a really bad event by itself.',
        whatItIs: 'A small savings boost for limited monthly cost.',
        teenTip: 'Good if you want some breathing room without spending much.',
      },
      {
        id: 'medium',
        label: 'Medium Cushion',
        cost: 20,
        savingsBoost: 400,
        quick: 'A stronger buffer that helps more events stay out of debt territory.',
        pitfall: 'Still does not replace missing coverage.',
        whatItIs: 'A medium savings upgrade.',
        teenTip: 'Pairs well with mid-level insurance choices.',
      },
      {
        id: 'large',
        label: 'Large Cushion',
        cost: 30,
        savingsBoost: 600,
        quick: 'The biggest cash buffer in the game.',
        pitfall: 'Cash alone cannot do what good insurance does on very large bills.',
        whatItIs: 'A larger savings reserve.',
        teenTip: 'Best when you want protection from deductibles and gaps after claims.',
      },
    ],
  },
]

const MYTH_CARDS: MythCard[] = [
  {
    id: 'm1',
    statement: "My landlord's insurance covers my stuff if there's a fire or theft.",
    answer: false,
    explanation:
      "Your landlord's insurance covers the building, not your belongings. Renters insurance protects your stuff.",
    tags: ['renters'],
  },
  {
    id: 'm2',
    statement: 'Liability insurance will cover damage to my own car after a crash.',
    answer: false,
    explanation:
      'Liability covers damage you cause to other people and their property. It does not fix your own car.',
    tags: ['auto'],
  },
  {
    id: 'm3',
    statement: "If I'm young and healthy, I do not really need health insurance.",
    answer: false,
    explanation:
      'Accidents and surprise illnesses can still happen. Health insurance helps stop one bad day from becoming a huge financial hit.',
    tags: ['health'],
  },
  {
    id: 'm4',
    statement: 'The cheapest insurance plan is always the smartest money choice.',
    answer: false,
    explanation:
      'Cheap plans can come with higher deductibles, lower payouts, or big coverage gaps. That can cost more later.',
    tags: ['auto', 'health', 'renters', 'dental'],
  },
  {
    id: 'm5',
    statement: 'Insurance will pay for everything after an incident.',
    answer: false,
    explanation:
      'Insurance usually has deductibles, limits, and exclusions. You still need to know what is missing.',
    tags: ['auto', 'health', 'renters', 'dental'],
  },
  {
    id: 'm6',
    statement: 'If another driver hits me, their insurance always covers my repairs.',
    answer: false,
    explanation:
      'Not if they have no insurance or not enough of it. That is why uninsured-driver protection matters.',
    tags: ['auto'],
  },
  {
    id: 'm7',
    statement: 'If I pick a stronger tier, I will usually pay less out of pocket after a claim.',
    answer: true,
    explanation:
      'That is the core idea. Stronger tiers usually cost more each month but reduce deductibles, gaps, or uncovered losses later.',
    tags: ['auto', 'health', 'renters', 'dental', 'vision'],
  },
  {
    id: 'm8',
    statement: 'Health insurance and dental insurance are basically the same thing.',
    answer: false,
    explanation:
      'Dental is often separate. A health plan can still leave you paying big dental bills on your own.',
    tags: ['health', 'dental'],
  },
  {
    id: 'm9',
    statement: 'Renters insurance is only worth it if you own expensive furniture.',
    answer: false,
    explanation:
      'Even a laptop, clothes, school gear, and headphones can add up fast. Renters insurance is often worth it for everyday belongings.',
    tags: ['renters'],
  },
  {
    id: 'm10',
    statement: 'Emergency savings can replace insurance completely.',
    answer: false,
    explanation:
      'Savings help with deductibles and smaller gaps, but a large loss can easily be much bigger than your cash buffer.',
    tags: ['savings'],
  },
  {
    id: 'm11',
    statement: 'Roadside-type help and real auto protection are basically the same thing.',
    answer: false,
    explanation:
      'Breakdown help is not the same as coverage for crashes, theft, or uninsured drivers.',
    tags: ['auto'],
  },
  {
    id: 'm12',
    statement:
      'Glasses and vision care are always covered by a normal health plan, so a separate vision plan is pointless.',
    answer: false,
    explanation:
      'Vision benefits are often separate. Eye exams, frames, lenses, and replacement glasses may need their own coverage or still cost you a lot without it.',
    tags: ['vision', 'health'],
  },
]

const EVENT_CARDS: EventCard[] = [
  {
    id: 'rear-end',
    emoji: '💥',
    title: 'You Rear-Ended Someone',
    desc: 'You look down for a second and tap the car in front of you. Both cars need repairs.',
    totalCost: 1800,
    type: 'auto-collision',
    lesson:
      'Liability helps the other driver, but stronger auto coverage matters if you also want help with your own car.',
    betterOption: 'A stronger auto tier lowers how much of this crash lands on you.',
  },
  {
    id: 'theft',
    emoji: '🔓',
    title: 'Your Laptop Was Stolen',
    desc: 'You leave your room unlocked for 20 minutes. Your laptop and headphones are gone.',
    totalCost: 1100,
    type: 'renters-loss',
    lesson: 'Renters insurance is about your belongings, not the building around them.',
    betterOption: 'Even a low-cost renters plan can protect expensive stuff.',
  },
  {
    id: 'urgent-care',
    emoji: '🏥',
    title: 'Urgent Care Visit',
    desc: 'You slip during intramurals and need X-rays and treatment. The bill arrives fast.',
    totalCost: 640,
    type: 'health-visit',
    lesson: 'Health tiers matter because weak plans may still leave you with a painful bill.',
    betterOption: 'A stronger health tier can turn a scary bill into a manageable one.',
  },
  {
    id: 'windshield',
    emoji: '🪟',
    title: 'Cracked Windshield',
    desc: 'A truck kicks up a rock on the freeway and your windshield cracks.',
    totalCost: 400,
    type: 'auto-comprehensive',
    lesson:
      'Not every car problem is a crash. Glass, theft, and weather usually need stronger auto protection.',
    betterOption: 'Comprehensive-style help usually appears only in stronger auto tiers.',
  },
  {
    id: 'uninsured-driver',
    emoji: '🚨',
    title: 'Hit by an Uninsured Driver',
    desc: 'Another driver runs a red light and hits your car. They have no insurance.',
    totalCost: 3200,
    type: 'auto-uninsured',
    lesson: 'Someone else causing the crash does not guarantee someone else can pay for it.',
    betterOption: "Auto plans with uninsured-driver help protect you from other people's mistakes.",
  },
  {
    id: 'pipe-leak',
    emoji: '💧',
    title: 'Apartment Pipe Leak',
    desc: 'A burst pipe damages your clothes, backpack, and laptop.',
    totalCost: 1400,
    type: 'renters-loss',
    lesson:
      'Your belongings need their own protection. The building owner does not insure your stuff for you.',
    betterOption: 'A renters tier often has one of the strongest value-to-cost ratios in the game.',
  },
  {
    id: 'root-canal',
    emoji: '🦷',
    title: 'Emergency Root Canal',
    desc: 'Weeks of tooth pain lead to a same-week procedure and a big bill.',
    totalCost: 900,
    type: 'dental-procedure',
    lesson:
      'Dental can be a separate risk from health insurance, which surprises a lot of first-time buyers.',
    betterOption: 'Dental tiers reduce how much a painful procedure also hurts your money.',
  },
  {
    id: 'broken-glasses',
    emoji: '👓',
    title: 'Broken Glasses',
    desc: 'Your glasses snap during practice and you need an exam plus a replacement pair this week.',
    totalCost: 380,
    type: 'vision-care',
    lesson:
      'Vision-related costs are often separate from normal health coverage, especially for exams and replacement eyewear.',
    betterOption: 'A vision tier can turn an annoying surprise into a manageable cost.',
  },
  {
    id: 'car-theft',
    emoji: '🚗',
    title: 'Your Car Was Stolen',
    desc: 'You parked overnight in an unfamiliar area. Your car is gone.',
    totalCost: 6000,
    type: 'auto-comprehensive',
    lesson: 'Theft is not the same as a crash. Stronger auto tiers usually handle it better.',
    betterOption: 'A fuller auto tier can be the difference between a bad day and a total loss.',
  },
]

const CATEGORIES = [
  { id: 'all', label: 'All Types', emoji: '🃏' },
  { id: 'auto', label: 'Auto', emoji: '🚗' },
  { id: 'health', label: 'Health', emoji: '❤️' },
  { id: 'renters', label: 'Renters', emoji: '🏠' },
  { id: 'savings', label: 'Savings', emoji: '💰' },
]

const initialState: GameState = {
  persona: null,
  selectedPlans: {},
  monthlySpent: 0,
  savings: 0,
  debt: 0,
  round: 0,
  totalRounds: 3,
  currentMyth: null,
  currentMythSet: [],
  currentMythIndex: 0,
  currentEvent: null,
  mythCorrect: 0,
  mythWrong: 0,
  mythSelection: 'pending',
  lessonsLearned: [],
  initialSavings: 0,
  activeCategory: 'all',
  usedMythIds: [],
  usedEventIds: [],
  lastOutcome: null,
  coachAdvice: null,
  coachLoading: false,
  coachAudioLoading: false,
  currentCoachSpeechText: '',
  endChartMode: 'metric',
  endComparisons: null,
}

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5)
const getDefaultPlans = (): PlanMap =>
  Object.fromEntries(INSURANCE_GROUPS.map((group) => [group.id, 'none']))
const getGroup = (groupId: string) => INSURANCE_GROUPS.find((group) => group.id === groupId)
const getTier = (groupId: string, tierId: string) =>
  getGroup(groupId)?.tiers.find((tier) => tier.id === tierId) ??
  getGroup(groupId)?.tiers[0] ??
  INSURANCE_GROUPS[0].tiers[0]

function getRelevantGroupName(eventType: string) {
  if (eventType.startsWith('auto')) return 'auto'
  if (eventType.startsWith('health')) return 'health'
  if (eventType.startsWith('renters')) return 'renters'
  if (eventType.startsWith('dental')) return 'dental'
  if (eventType.startsWith('vision')) return 'vision'
  return 'savings'
}

function getCoverageStrengthLabel(tier: Tier) {
  if (tier.id === 'none') return 'missing'
  if ((tier.payoutRate ?? 0) >= 0.85) return 'strong'
  if ((tier.payoutRate ?? 0) >= 0.6) return 'mid'
  return 'thin'
}

function getNextTier(groupId: string, tierId: string) {
  const group = getGroup(groupId)
  const currentIndex = group?.tiers.findIndex((tier) => tier.id === tierId) ?? -1
  if (!group || currentIndex < 0 || currentIndex >= group.tiers.length - 1) return null
  return group.tiers[currentIndex + 1]
}

function getStateFarmSuggestion(groupId: string, tierId: string) {
  const stateFarmUrls: Record<string, string> = {
    auto: 'https://www.statefarm.com/insurance/auto',
    renters: 'https://www.statefarm.com/insurance/home-and-property/renters',
    health: 'https://www.statefarm.com/insurance/health',
    dental: 'https://www.statefarm.com/insurance/health',
    vision: 'https://www.statefarm.com/insurance/health',
    savings: 'https://www.statefarm.com/insurance/auto',
  }
  const group = getGroup(groupId)
  const currentTier = getTier(groupId, tierId)
  const nextTier = getNextTier(groupId, tierId)
  const stateFarmUrl = stateFarmUrls[groupId] ?? 'https://www.statefarm.com/'

  if (!group || !currentTier) {
    return {
      stateFarmLabel: 'State Farm Match',
      stateFarmNote: 'A stronger plan in the affected category would have covered more of the gap.',
      stateFarmCta: 'Compare a stronger protection tier for this situation.',
      stateFarmUrl,
    }
  }

  if (!nextTier) {
    return {
      stateFarmLabel: `State Farm Match: ${group.name}`,
      stateFarmNote: `You already chose the strongest ${group.name.toLowerCase()} tier in this game. The best next State Farm-style move is keeping this coverage and pairing it with more emergency savings.`,
      stateFarmCta: 'Keep this tier and strengthen your savings cushion.',
      stateFarmUrl,
    }
  }

  return {
    stateFarmLabel: `State Farm Match: ${nextTier.label}`,
    stateFarmNote: `${nextTier.label} is the closest State Farm-style upgrade for this gap. It would have improved the ${group.name.toLowerCase()} side of this event compared with ${currentTier.label}.`,
    stateFarmCta: `Move from ${currentTier.label} to ${nextTier.label} to cover more of this risk.`,
    stateFarmUrl,
  }
}

function getCoachGrade(riskLevel: number) {
  if (riskLevel >= 85) return { letter: 'F', tone: 'bad' as const }
  if (riskLevel >= 70) return { letter: 'D', tone: 'bad' as const }
  if (riskLevel >= 55) return { letter: 'C', tone: 'mid' as const }
  if (riskLevel >= 35) return { letter: 'B', tone: 'mid' as const }
  return { letter: 'A', tone: 'good' as const }
}

function toFiniteNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(\.\d+)?/)
    if (!match) return fallback
    const parsed = Number(match[0])
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function normalizeCoachData(data: Record<string, unknown>, sourceLabel: string): Coach {
  const riskLevel = Math.max(0, Math.min(100, toFiniteNumber(data.riskLevel, 0)))
  const insuranceShare = Math.max(0, Math.min(100, toFiniteNumber(data.insuranceShare, 0)))
  const playerShare = Math.max(
    0,
    Math.min(100, toFiniteNumber(data.playerShare, 100 - insuranceShare))
  )
  const fallbackGrade = getCoachGrade(riskLevel)

  return {
    summary: String(data.summary || 'This plan changed the result more than expected.'),
    riskLevel,
    insuranceShare,
    playerShare,
    planGrade: String(data.planGrade || fallbackGrade.letter),
    gradeTone: String(data.gradeTone || fallbackGrade.tone) as Coach['gradeTone'],
    mainGap: String(data.mainGap || 'No clear gap identified.'),
    strongestPoint: String(
      data.strongestPoint || 'The plan had at least one useful protection layer.'
    ),
    moneyImpact: String(data.moneyImpact || 'The money impact was manageable.'),
    nextMoveLabel: String(data.nextMoveLabel || 'Next Move'),
    nextMoveText: String(data.nextMoveText || 'Strengthen the weakest coverage area first.'),
    budgetShare: Math.max(0, Math.min(100, toFiniteNumber(data.budgetShare, 0))),
    monthlyCost: toFiniteNumber(data.monthlyCost, 0),
    extraMonthlyCost: toFiniteNumber(data.extraMonthlyCost, 0),
    estimatedDebtReduction: toFiniteNumber(data.estimatedDebtReduction, 0),
    stateFarmLabel: String(data.stateFarmLabel || 'State Farm Match'),
    stateFarmNote: String(
      data.stateFarmNote || 'A stronger plan in this category would have covered more of the gap.'
    ),
    stateFarmCta: String(
      data.stateFarmCta || 'Compare a stronger protection tier for this situation.'
    ),
    stateFarmUrl: String(data.stateFarmUrl || 'https://www.statefarm.com/'),
    sourceLabel,
  }
}

function buildCoachNarrationText(coach: Coach) {
  return [
    coach.summary,
    `Risk level ${coach.riskLevel} out of 100.`,
    `Main gap: ${coach.mainGap}`,
    `Strongest point: ${coach.strongestPoint}`,
    `Money impact: ${coach.moneyImpact}`,
    `${coach.stateFarmLabel}. ${coach.stateFarmNote}`,
    `${coach.nextMoveLabel}: ${coach.nextMoveText}`,
  ].join(' ')
}

function parseCoachResponse(response: string) {
  const trimmed = response
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  const candidate =
    firstBrace >= 0 && lastBrace > firstBrace ? trimmed.slice(firstBrace, lastBrace + 1) : trimmed
  return JSON.parse(candidate)
}
function evaluateEvent(event: EventCard, selectedPlans: PlanMap, startingSavings: number): Outcome {
  const auto = getTier('auto', selectedPlans.auto || 'none')
  const health = getTier('health', selectedPlans.health || 'none')
  const renters = getTier('renters', selectedPlans.renters || 'none')
  const dental = getTier('dental', selectedPlans.dental || 'none')
  const vision = getTier('vision', selectedPlans.vision || 'none')

  let insurerPays = 0
  let youPay = 0
  let resultType: Outcome['resultType'] = 'bad'
  let resultTitle = 'Not Covered'
  let resultIcon = '💸'
  let consequence = 'Your plan did not really protect you here.'
  let usedTierName = 'None'

  if (event.type === 'auto-collision') {
    if (!auto.liability && !auto.collision) {
      youPay = event.totalCost
    } else if (auto.liability && !auto.collision) {
      insurerPays = Math.floor(event.totalCost * 0.35 * (auto.payoutRate ?? 0))
      youPay = event.totalCost - insurerPays
      resultType = 'neutral'
      resultTitle = 'Only Partly Protected'
      resultIcon = '⚠️'
      consequence =
        'Your plan helped mostly with the other driver, but your own car damage was still a problem.'
      usedTierName = auto.label
    } else {
      insurerPays = Math.max(
        0,
        Math.floor((event.totalCost - (auto.deductible ?? 0)) * (auto.payoutRate ?? 0))
      )
      youPay = event.totalCost - insurerPays
      resultType = (auto.payoutRate ?? 0) >= 0.8 ? 'good' : 'neutral'
      resultTitle = (auto.payoutRate ?? 0) >= 0.8 ? 'Well Covered' : 'Mostly Covered'
      resultIcon = (auto.payoutRate ?? 0) >= 0.8 ? '✅' : '⚠️'
      consequence = `Your ${auto.label} tier helped with both liability and your own car damage, but the deductible and plan strength still mattered.`
      usedTierName = auto.label
    }
  }

  if (event.type === 'auto-comprehensive') {
    if (!auto.comprehensive) {
      youPay = event.totalCost
    } else {
      insurerPays = Math.max(
        0,
        Math.floor((event.totalCost - (auto.deductible ?? 0)) * (auto.payoutRate ?? 0))
      )
      youPay = event.totalCost - insurerPays
      resultType = (auto.payoutRate ?? 0) >= 0.8 ? 'good' : 'neutral'
      resultTitle =
        (auto.payoutRate ?? 0) >= 0.8 ? 'Protected from Non-Crash Loss' : 'Partly Protected'
      resultIcon = (auto.payoutRate ?? 0) >= 0.8 ? '✅' : '⚠️'
      consequence = `Your ${auto.label} tier helped because it includes non-crash protection like theft, glass, or weather.`
      usedTierName = auto.label
    }
  }

  if (event.type === 'auto-uninsured') {
    if (!auto.uninsured) {
      youPay = event.totalCost
    } else {
      insurerPays = Math.max(
        0,
        Math.floor((event.totalCost - (auto.deductible ?? 0)) * (auto.payoutRate ?? 0))
      )
      youPay = event.totalCost - insurerPays
      resultType = (auto.payoutRate ?? 0) >= 0.8 ? 'good' : 'neutral'
      resultTitle =
        (auto.payoutRate ?? 0) >= 0.8 ? 'Protected from Uninsured Driver' : 'Only Partly Protected'
      resultIcon = (auto.payoutRate ?? 0) >= 0.8 ? '✅' : '⚠️'
      consequence = `Your ${auto.label} tier helped when the at-fault driver could not pay.`
      usedTierName = auto.label
    }
  }

  if (event.type === 'health-visit') {
    if (!health.urgentCare) {
      youPay = event.totalCost
    } else {
      insurerPays = Math.max(
        0,
        Math.floor((event.totalCost - (health.deductible ?? 0)) * (health.payoutRate ?? 0))
      )
      youPay = event.totalCost - insurerPays
      resultType =
        (health.payoutRate ?? 0) >= 0.8
          ? 'good'
          : (health.payoutRate ?? 0) >= 0.5
            ? 'neutral'
            : 'bad'
      resultTitle =
        (health.payoutRate ?? 0) >= 0.8
          ? 'Medical Bill Softened'
          : (health.payoutRate ?? 0) >= 0.5
            ? 'Barely Manageable'
            : 'Still a Painful Bill'
      resultIcon = (health.payoutRate ?? 0) >= 0.8 ? '✅' : '⚠️'
      consequence = `Your ${health.label} changed the result, but weaker health tiers still leave big bills behind.`
      usedTierName = health.label
    }
  }

  if (event.type === 'renters-loss') {
    if (!renters.belongings) {
      youPay = event.totalCost
    } else {
      insurerPays = Math.max(
        0,
        Math.floor((event.totalCost - (renters.deductible ?? 0)) * (renters.payoutRate ?? 0))
      )
      youPay = event.totalCost - insurerPays
      resultType = (renters.payoutRate ?? 0) >= 0.8 ? 'good' : 'neutral'
      resultTitle = (renters.payoutRate ?? 0) >= 0.8 ? 'Belongings Protected' : 'Partly Protected'
      resultIcon = (renters.payoutRate ?? 0) >= 0.8 ? '✅' : '⚠️'
      consequence = `Your ${renters.label} protected your stuff, but the tier level still changed how much you paid.`
      usedTierName = renters.label
    }
  }

  if (event.type === 'dental-procedure') {
    if (!dental.dental) {
      youPay = event.totalCost
    } else {
      insurerPays = Math.max(
        0,
        Math.floor((event.totalCost - (dental.deductible ?? 0)) * (dental.payoutRate ?? 0))
      )
      youPay = event.totalCost - insurerPays
      resultType = (dental.payoutRate ?? 0) >= 0.8 ? 'good' : 'neutral'
      resultTitle = (dental.payoutRate ?? 0) >= 0.8 ? 'Dental Bill Reduced' : 'Only Some Help'
      resultIcon = (dental.payoutRate ?? 0) >= 0.8 ? '✅' : '⚠️'
      consequence = `Your ${dental.label} helped, showing why dental can matter separately from normal health coverage.`
      usedTierName = dental.label
    }
  }

  if (event.type === 'vision-care') {
    if (!vision.vision) {
      youPay = event.totalCost
    } else {
      insurerPays = Math.max(
        0,
        Math.floor((event.totalCost - (vision.deductible ?? 0)) * (vision.payoutRate ?? 0))
      )
      youPay = event.totalCost - insurerPays
      resultType = (vision.payoutRate ?? 0) >= 0.8 ? 'good' : 'neutral'
      resultTitle = (vision.payoutRate ?? 0) >= 0.8 ? 'Vision Cost Reduced' : 'Only Some Help'
      resultIcon = (vision.payoutRate ?? 0) >= 0.8 ? '✅' : '⚠️'
      consequence = `Your ${vision.label} helped, showing why vision care can be its own separate cost category.`
      usedTierName = vision.label
    }
  }

  const fromSavings = Math.min(youPay, startingSavings)
  const endingSavings = startingSavings - fromSavings
  const addedDebt = youPay - fromSavings

  return {
    totalCost: event.totalCost,
    insurerPays,
    youPay,
    endingSavings,
    addedDebt,
    resultType,
    resultTitle,
    resultIcon,
    consequence,
    usedTierName,
    relevantGroup: getRelevantGroupName(event.type),
  }
}

function simulatePlan(selectedPlans: PlanMap, persona: Persona, rounds: number) {
  let totalDebt = 0
  let totalSavings = 0
  let totalOutOfPocket = 0

  for (let i = 0; i < 120; i++) {
    let savings =
      persona.savings + (getTier('savings', selectedPlans.savings || 'none').savingsBoost || 0)
    let debt = 0
    let outOfPocket = 0

    for (let round = 0; round < rounds; round++) {
      const weightedBag: EventCard[] = []
      EVENT_CARDS.forEach((event) => {
        weightedBag.push(event)
        if (
          persona.riskBoost.some((risk) => event.type.includes(risk) || event.id.includes(risk))
        ) {
          weightedBag.push(event, event)
        }
      })
      const event = weightedBag[Math.floor(Math.random() * weightedBag.length)]
      const outcome = evaluateEvent(event, selectedPlans, savings)
      savings = outcome.endingSavings
      debt += outcome.addedDebt
      outOfPocket += outcome.youPay
    }

    totalDebt += debt
    totalSavings += savings
    totalOutOfPocket += outOfPocket
  }

  return {
    avgDebt: Math.round(totalDebt / 120),
    avgSavings: Math.round(totalSavings / 120),
    avgOutOfPocket: Math.round(totalOutOfPocket / 120),
    monthlyCost: INSURANCE_GROUPS.reduce(
      (sum, group) => sum + (getTier(group.id, selectedPlans[group.id] || 'none').cost || 0),
      0
    ),
  }
}

function InsuranceCardGame({ onComplete }: { onComplete?: (summary: string) => void } = {}) {
  const [screen, setScreen] = useState<Screen>('screen-title')
  const [modal, setModal] = useState<Modal>('none')
  const [state, setState] = useState<GameState>(initialState)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  })
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({})
  const [guideFlippedCards, setGuideFlippedCards] = useState<Record<string, boolean>>({})

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const persona = state.persona
  const budget = persona?.budget ?? 0
  const remaining = budget - state.monthlySpent

  const filteredGroups = useMemo(() => {
    return state.activeCategory === 'all'
      ? INSURANCE_GROUPS
      : INSURANCE_GROUPS.filter((group) => group.category === state.activeCategory)
  }, [state.activeCategory])

  const selectedTier = (groupId: string) => getTier(groupId, state.selectedPlans[groupId] || 'none')

  const choosePersona = (personaId: string) => {
    const nextPersona = PERSONAS.find((persona) => persona.id === personaId)
    if (!nextPersona) return

    setState({
      ...initialState,
      persona: nextPersona,
      selectedPlans: getDefaultPlans(),
      savings: nextPersona.savings,
      initialSavings: nextPersona.savings,
    })
    setFlippedCards({})
    setGuideFlippedCards({})
    setScreen('screen-protection')
  }

  const chooseTier = (groupId: string, tierId: string) => {
    if (!persona) return
    const currentTier = selectedTier(groupId)
    const nextTier = getTier(groupId, tierId)
    const nextSpent = state.monthlySpent - currentTier.cost + nextTier.cost
    if (nextSpent > persona.budget) return

    setState((prev) => ({
      ...prev,
      selectedPlans: { ...prev.selectedPlans, [groupId]: tierId },
      monthlySpent: nextSpent,
      savings: prev.savings - (currentTier.savingsBoost ?? 0) + (nextTier.savingsBoost ?? 0),
    }))
  }

  const startMyths = () => {
    const selectedTags = Object.entries(state.selectedPlans)
      .filter(([, tierId]) => tierId && tierId !== 'none')
      .map(([groupId]) => {
        if (groupId === 'dental') return 'dental'
        if (groupId === 'vision') return 'vision'
        return getGroup(groupId)?.category
      })
      .filter(Boolean) as string[]

    const uniqueTags = [
      ...new Set(selectedTags.length ? selectedTags : ['auto', 'health', 'renters']),
    ]
    const preferred = MYTH_CARDS.filter(
      (card) =>
        card.tags.some((tag) => uniqueTags.includes(tag)) && !state.usedMythIds.includes(card.id)
    )
    const fallback = MYTH_CARDS.filter((card) => !state.usedMythIds.includes(card.id))
    const set = (preferred.length ? shuffle(preferred) : shuffle(fallback)).slice(0, 3)

    setState((prev) => ({
      ...prev,
      currentMythSet: set,
      currentMythIndex: 0,
      currentMyth: set[0] ?? null,
      mythSelection: 'pending',
      usedMythIds: [...prev.usedMythIds, ...set.map((card) => card.id)],
    }))
    setScreen('screen-myth')
  }

  const answerMyth = (answer: boolean | null) => {
    if (!state.currentMyth || state.mythSelection !== 'pending') return
    const correct = answer === state.currentMyth.answer

    setState((prev) => ({
      ...prev,
      mythSelection: answer,
      mythCorrect: answer !== null && correct ? prev.mythCorrect + 1 : prev.mythCorrect,
      mythWrong: answer !== null && !correct ? prev.mythWrong + 1 : prev.mythWrong,
    }))

    fetch('/api/xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameType: 'insurance_card_game',
        xpEarned: correct ? 10 : 2,
        reason: correct ? 'Correct myth answer' : 'Myth attempt',
      }),
    }).catch(() => {})
  }

  const nextMyth = () => {
    if (state.currentMythIndex < state.currentMythSet.length - 1) {
      const nextIndex = state.currentMythIndex + 1
      setState((prev) => ({
        ...prev,
        currentMythIndex: nextIndex,
        currentMyth: prev.currentMythSet[nextIndex] ?? null,
        mythSelection: 'pending',
      }))
      return
    }

    if (!persona) return
    const available = EVENT_CARDS.filter((event) => !state.usedEventIds.includes(event.id))
    const pool = available.length ? available : EVENT_CARDS
    const boosted = pool.filter((event) =>
      persona.riskBoost.some((risk) => event.type.includes(risk) || event.id.includes(risk))
    )
    const event = shuffle(boosted.length && Math.random() < 0.6 ? boosted : pool)[0]
    if (!event) return

    setState((prev) => ({
      ...prev,
      currentEvent: event,
      usedEventIds: [...prev.usedEventIds, event.id],
    }))
    setScreen('screen-event')
  }

  const resolveEvent = () => {
    if (!state.currentEvent) return
    const outcome = evaluateEvent(state.currentEvent, state.selectedPlans, state.savings)

    setState((prev) => ({
      ...prev,
      savings: outcome.endingSavings,
      debt: prev.debt + outcome.addedDebt,
      lessonsLearned: [...prev.lessonsLearned, prev.currentEvent?.lesson || ''],
      lastOutcome: outcome,
      coachAdvice: null,
      coachLoading: false,
      coachAudioLoading: false,
      currentCoachSpeechText: '',
    }))
    setScreen('screen-result')
  }
  const localCoach = (gameState: GameState): Coach | null => {
    if (!gameState.persona || !gameState.currentEvent || !gameState.lastOutcome) return null

    const tier = getTier(
      gameState.lastOutcome.relevantGroup,
      gameState.selectedPlans[gameState.lastOutcome.relevantGroup] || 'none'
    )
    const nextTier = getNextTier(gameState.lastOutcome.relevantGroup, tier.id)
    const stateFarmSuggestion = getStateFarmSuggestion(gameState.lastOutcome.relevantGroup, tier.id)
    const insuranceShare = gameState.lastOutcome.totalCost
      ? Math.round((gameState.lastOutcome.insurerPays / gameState.lastOutcome.totalCost) * 100)
      : 0
    const playerShare = 100 - insuranceShare
    const riskLevel = Math.max(
      5,
      Math.min(
        100,
        Math.round(
          (gameState.lastOutcome.addedDebt > 0 ? 45 : 0) +
            (gameState.lastOutcome.youPay / Math.max(gameState.lastOutcome.totalCost, 1)) * 35 +
            (tier.id === 'none'
              ? 20
              : getCoverageStrengthLabel(tier) === 'thin'
                ? 12
                : getCoverageStrengthLabel(tier) === 'mid'
                  ? 6
                  : 0)
        )
      )
    )
    const grade = getCoachGrade(riskLevel)
    const extraMonthlyCost = nextTier ? Math.max(0, nextTier.cost - tier.cost) : 0
    const estimatedDebtReduction = nextTier
      ? Math.max(
          0,
          Math.round(
            gameState.lastOutcome.addedDebt +
              Math.max(
                0,
                gameState.lastOutcome.youPay - Math.floor(gameState.lastOutcome.youPay * 0.45)
              )
          )
        )
      : Math.max(0, Math.round(gameState.lastOutcome.addedDebt * 0.35))

    return normalizeCoachData(
      {
        summary:
          tier.id === 'none'
            ? `${gameState.currentEvent.title} exposed a major gap in your plan.`
            : `${tier.label} changed the outcome, but not enough to make ${gameState.currentEvent.title.toLowerCase()} feel easy.`,
        riskLevel,
        insuranceShare,
        playerShare,
        planGrade: grade.letter,
        gradeTone: grade.tone,
        mainGap:
          tier.id === 'none'
            ? `You had no ${gameState.lastOutcome.relevantGroup} coverage for this event, so almost the entire loss landed on you.`
            : `${tier.label} still left too much of the bill with the player because the deductible and payout strength were not strong enough.`,
        strongestPoint:
          tier.id === 'none'
            ? 'The only upside was saving monthly premium, but that tradeoff backfired badly here.'
            : `${tier.label} did provide real protection. Insurance covered $${gameState.lastOutcome.insurerPays.toLocaleString()} instead of leaving the player fully exposed.`,
        moneyImpact:
          gameState.lastOutcome.addedDebt > 0
            ? `After savings ran out, this event still created $${gameState.lastOutcome.addedDebt.toLocaleString()} in new debt.`
            : `The player absorbed $${gameState.lastOutcome.youPay.toLocaleString()} without adding debt, which made this event survivable.`,
        nextMoveLabel: 'Upgrade Move',
        nextMoveText: nextTier
          ? `Move up to ${nextTier.label}. It costs about $${extraMonthlyCost}/month more and is the clearest way to reduce pain in events like this.`
          : 'You already have the top tier here. The next improvement is a larger savings cushion or strengthening another weak category.',
        budgetShare: Math.round((gameState.monthlySpent / gameState.persona.budget) * 100),
        monthlyCost: tier.cost || 0,
        extraMonthlyCost,
        estimatedDebtReduction,
        stateFarmLabel: stateFarmSuggestion.stateFarmLabel,
        stateFarmNote: stateFarmSuggestion.stateFarmNote,
        stateFarmCta: stateFarmSuggestion.stateFarmCta,
      },
      'Visual coaching generated from the game rules in this component, then refined by Claude when available.'
    )
  }

  const coachMe = async () => {
    if (!state.persona || !state.currentEvent || !state.lastOutcome) return
    const fallback = localCoach(state)
    if (!fallback) return

    setState((prev) => ({
      ...prev,
      coachLoading: true,
      coachAdvice: fallback,
      currentCoachSpeechText: buildCoachNarrationText(fallback),
    }))

    try {
      const prompt = `You are a coach for an insurance card game. Return JSON only with these exact fields:\nsummary, riskLevel, planGrade, gradeTone, insuranceShare, playerShare, mainGap, strongestPoint, moneyImpact, nextMoveLabel, nextMoveText, budgetShare, monthlyCost, extraMonthlyCost, estimatedDebtReduction, stateFarmLabel, stateFarmNote, stateFarmCta, stateFarmUrl.\n\nData: ${JSON.stringify(
        {
          persona: state.persona,
          event: state.currentEvent,
          outcome: state.lastOutcome,
          monthlySpent: state.monthlySpent,
          savings: state.savings,
          debt: state.debt,
          selectedPlans: state.selectedPlans,
        }
      )}`

      const response = await callClaude(prompt)
      if (!response.trim()) throw new Error('empty')
      const parsed = parseCoachResponse(response) as Record<string, unknown>
      const suggestion = getStateFarmSuggestion(
        state.lastOutcome.relevantGroup,
        state.selectedPlans[state.lastOutcome.relevantGroup] || 'none'
      )
      const coach = normalizeCoachData(
        {
          ...suggestion,
          ...parsed,
        },
        'Generated by Claude from the current game state.'
      )

      setState((prev) => ({
        ...prev,
        coachAdvice: coach,
        currentCoachSpeechText: buildCoachNarrationText(coach),
        coachLoading: false,
      }))
    } catch {
      setState((prev) => ({ ...prev, coachLoading: false }))
    }
  }

  const playCoachAudio = () => {
    const text = state.currentCoachSpeechText.trim()
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onend = () => setState((prev) => ({ ...prev, coachAudioLoading: false }))
    utterance.onerror = () => setState((prev) => ({ ...prev, coachAudioLoading: false }))

    setState((prev) => ({ ...prev, coachAudioLoading: true }))
    window.speechSynthesis.speak(utterance)
  }

  const nextRound = () => {
    if (!persona) return

    if (state.round + 1 >= state.totalRounds) {
      const comparisons: Comparison[] = [
        {
          key: 'player',
          label: 'Your Plan',
          result: simulatePlan(state.selectedPlans, persona, state.totalRounds),
        },
        {
          key: 'no-plan',
          label: 'No Coverage',
          result: simulatePlan(
            {
              auto: 'none',
              health: 'none',
              renters: 'none',
              dental: 'none',
              vision: 'none',
              savings: 'none',
            },
            persona,
            state.totalRounds
          ),
        },
        {
          key: 'cheap',
          label: 'Cheapest Mix',
          result: simulatePlan(
            {
              auto: 'minimum',
              health: 'bare',
              renters: 'basic',
              dental: 'none',
              vision: 'none',
              savings: 'small',
            },
            persona,
            state.totalRounds
          ),
        },
        {
          key: 'balanced',
          label: 'Balanced Plan',
          result: simulatePlan(
            {
              auto: 'standard',
              health: 'standard',
              renters: 'standard',
              dental: 'basic',
              vision: 'basic',
              savings: 'medium',
            },
            persona,
            state.totalRounds
          ),
        },
        {
          key: 'heavy',
          label: 'Heavy Protection',
          result: simulatePlan(
            {
              auto: 'strong',
              health: 'strong',
              renters: 'premium',
              dental: 'strong',
              vision: 'strong',
              savings: 'large',
            },
            persona,
            state.totalRounds
          ),
        },
      ]

      setState((prev) => ({ ...prev, endComparisons: comparisons }))
      setScreen('screen-end')
      onCompleteRef.current?.(
        `insurance card game finished — result: ${state.lastOutcome?.resultTitle ?? 'complete'} after ${state.totalRounds} rounds`
      )
      fetch('/api/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: 'insurance_card_game',
          xpEarned: 20,
          reason: 'Completed insurance card game',
        }),
      }).catch(() => {})
      return
    }

    setState((prev) => ({
      ...prev,
      round: prev.round + 1,
      activeCategory: 'all',
      currentMyth: null,
      currentMythSet: [],
      currentMythIndex: 0,
      currentEvent: null,
      mythSelection: 'pending',
      coachAdvice: null,
      coachLoading: false,
      coachAudioLoading: false,
      currentCoachSpeechText: '',
    }))
    setFlippedCards({})
    setScreen('screen-protection')
  }

  const replay = () => {
    if (!persona) return
    choosePersona(persona.id)
  }

  const chooseDifferentPersona = () => {
    setState(initialState)
    setScreen('screen-persona')
    setFlippedCards({})
    setGuideFlippedCards({})
  }

  const score =
    state.savings -
    state.debt +
    state.mythCorrect * 200 +
    Object.values(state.selectedPlans).filter((value) => value && value !== 'none').length * 50
  const finalGrade =
    score > 1200
      ? { grade: 'A', color: '#5cb87a', label: 'Financial Pro' }
      : score > 700
        ? { grade: 'B', color: '#5b9bd5', label: 'Solid Planner' }
        : score > 200
          ? { grade: 'C', color: '#e8824a', label: 'Getting There' }
          : score > -200
            ? { grade: 'D', color: '#ff9966', label: 'Risk Taker' }
            : { grade: 'F', color: '#d94f3d', label: 'Financially Exposed' }

  const comparisons = state.endComparisons ?? []
  const maxDebt = Math.max(...comparisons.map((comparison) => comparison.result.avgDebt), 1)
  const maxSavings = Math.max(...comparisons.map((comparison) => comparison.result.avgSavings), 1)
  const maxOutOfPocket = Math.max(
    ...comparisons.map((comparison) => comparison.result.avgOutOfPocket),
    1
  )
  const bestDebt = comparisons.length
    ? [...comparisons].sort((a, b) => a.result.avgDebt - b.result.avgDebt)[0]
    : null
  const bestSavings = comparisons.length
    ? [...comparisons].sort((a, b) => b.result.avgSavings - a.result.avgSavings)[0]
    : null

  const mythLabels = state.currentMyth
    ? [
        ...new Set(
          state.currentMyth.tags.map((tag) => {
            if (tag === 'auto') return 'Auto Insurance'
            if (tag === 'health') return 'Health Insurance'
            if (tag === 'renters') return 'Renters Insurance'
            if (tag === 'dental') return 'Dental Coverage'
            if (tag === 'vision') return 'Vision Coverage'
            return 'Emergency Fund'
          })
        ),
      ]
    : []

  return (
    <div className="sn-root">
      {screen !== 'screen-title' && persona ? (
        <div className="sn-hud">
          <div className="sn-hud-pill">
            {persona.emoji} {persona.name}
          </div>
          <div className="sn-hud-spacer" />
          <div className="sn-hud-stat">
            <span>Round</span>
            <strong>
              {Math.min(state.round + 1, state.totalRounds)}/{state.totalRounds}
            </strong>
          </div>
          <div className="sn-hud-stat">
            <span>Budget</span>
            <strong>${persona.budget}/mo</strong>
          </div>
          <div className="sn-hud-stat">
            <span>Spend</span>
            <strong>${state.monthlySpent}/mo</strong>
          </div>
          <div className="sn-hud-meter">
            <span>Savings ${state.savings}</span>
            <div className="sn-progress">
              <div
                className="sn-progress-fill green"
                style={{
                  width: `${Math.max(0, Math.min(100, (state.savings / (persona.savings + 600)) * 100))}%`,
                }}
              />
            </div>
          </div>
          <div className="sn-hud-meter">
            <span>Debt ${state.debt}</span>
            <div className="sn-progress">
              <div
                className="sn-progress-fill red"
                style={{ width: `${Math.max(0, Math.min(100, (state.debt / 6000) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
      {screen === 'screen-title' ? (
        <section className="sn-screen sn-title-screen">
          <div className="sn-title-shell">
            <div className="sn-step-pill">The Insurance Card Game</div>
            <h1 className="sn-title-logo">
              SAFETY <span>NET</span>
            </h1>
            <p className="sn-lead">
              Build your protection. Face real life. Learn how cheap plans, stronger plans, and
              coverage gaps change what happens.
            </p>
            <div className="sn-title-cards">
              <div>🧑</div>
              <div>🛡️</div>
              <div>⚡</div>
              <div>📊</div>
            </div>
            <div className="sn-stack-actions">
              <button className="sn-primary" onClick={() => setScreen('screen-persona')}>
                DEAL THE CARDS
              </button>
              <button className="sn-secondary" onClick={() => setModal('guide')}>
                Coverage Guide
              </button>
              <button className="sn-secondary" onClick={() => setModal('how')}>
                How to play
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {screen === 'screen-persona' ? (
        <section className="sn-screen">
          <div className="sn-content">
            <div className="sn-top">
              <div className="sn-step-pill">Step 1 of 4</div>
              <h2>Choose Your Persona</h2>
              <p>
                Your life situation shapes your risks, budget, and what protection matters most.
              </p>
            </div>
            <div className="sn-persona-grid">
              {PERSONAS.map((persona) => (
                <button
                  key={persona.id}
                  className="sn-persona-card"
                  onClick={() => choosePersona(persona.id)}
                  style={{ borderTopColor: persona.color }}
                >
                  <div className="sn-persona-emoji">{persona.emoji}</div>
                  <h3>{persona.name}</h3>
                  <p>{persona.desc}</p>
                  <div className="sn-persona-stats">
                    <div>
                      <span>Budget</span>
                      <strong>${persona.budget}/mo</strong>
                    </div>
                    <div>
                      <span>Savings</span>
                      <strong>${persona.savings}</strong>
                    </div>
                  </div>
                  <div className="sn-risk-pill">Higher risk: {persona.riskBoost.join(', ')}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {screen === 'screen-protection' ? (
        <section className="sn-screen">
          <div className="sn-content">
            <div className="sn-top">
              <div className="sn-step-pill">
                {state.round === 0
                  ? 'Step 2 of 4'
                  : `Round ${state.round + 1} of ${state.totalRounds}`}
              </div>
              <h2>{state.round === 0 ? 'Build Your Safety Net' : 'Adjust Your Plan'}</h2>
              <p>
                {state.round === 0
                  ? 'Pick one tier for each insurance type. Bigger protection usually costs more, but changes what happens later.'
                  : 'After what happened, adjust your coverage before the next round.'}
              </p>
            </div>
            <div className="sn-protection-toolbar">
              <button
                className="sn-secondary"
                onClick={() =>
                  state.round === 0 ? setScreen('screen-persona') : setScreen('screen-result')
                }
              >
                {state.round === 0 ? 'Change Persona' : 'Back'}
              </button>
              <div className="sn-budget-card">
                <div>
                  <span>Monthly Budget</span>
                  <strong>${budget}</strong>
                </div>
                <div>
                  <span>Spent</span>
                  <strong className="redText">${state.monthlySpent}</strong>
                </div>
                <div>
                  <span>Remaining</span>
                  <strong className={remaining >= 0 ? 'greenText' : 'redText'}>${remaining}</strong>
                </div>
              </div>
            </div>
            <div className="sn-tabs">
              {CATEGORIES.map((category) => {
                const count =
                  category.id === 'all'
                    ? Object.values(state.selectedPlans).filter(
                        (value) => value && value !== 'none'
                      ).length
                    : INSURANCE_GROUPS.filter(
                        (group) =>
                          group.category === category.id &&
                          state.selectedPlans[group.id] &&
                          state.selectedPlans[group.id] !== 'none'
                      ).length
                return (
                  <button
                    key={category.id}
                    className={`sn-tab ${state.activeCategory === category.id ? 'active' : ''}`}
                    onClick={() => setState((prev) => ({ ...prev, activeCategory: category.id }))}
                  >
                    {category.emoji} {category.label}
                    {count > 0 ? <span>{count}</span> : null}
                  </button>
                )
              })}
            </div>
            <div className="sn-coverage-grid">
              {filteredGroups.map((group) => {
                const isFlipped = flippedCards[group.id]
                const currentTier = selectedTier(group.id)
                return (
                  <div key={group.id} className={`sn-flip-card ${isFlipped ? 'flipped' : ''}`}>
                    <div className="sn-flip-inner">
                      <div
                        className="sn-card-face sn-card-front"
                        onClick={() => setFlippedCards((prev) => ({ ...prev, [group.id]: true }))}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="sn-card-top">
                          <div>
                            <div className="sn-card-title">
                              {group.icon} {group.name}
                            </div>
                            <p className="sn-card-copy">{group.summary}</p>
                          </div>
                        </div>
                        <div className="sn-current-tier">
                          <span>Current Tier</span>
                          <strong>{currentTier.label}</strong>
                          <em>${currentTier.cost}/mo</em>
                        </div>
                        <div className="sn-current-copy">{currentTier.whatItIs}</div>
                        <div className="sn-current-tip">{currentTier.teenTip}</div>
                      </div>
                      <div className="sn-card-face sn-card-back">
                        <div className="sn-card-top">
                          <div className="sn-card-title">
                            {group.icon} {group.name}
                          </div>
                          <button
                            className="sn-flip-btn"
                            onClick={() =>
                              setFlippedCards((prev) => ({ ...prev, [group.id]: false }))
                            }
                          >
                            Back
                          </button>
                        </div>
                        <div className="sn-tier-stack">
                          {group.tiers.map((tier) => {
                            const isSelected = state.selectedPlans[group.id] === tier.id
                            const proposedSpend = state.monthlySpent - currentTier.cost + tier.cost
                            const unavailable = !isSelected && proposedSpend > budget
                            return (
                              <button
                                key={tier.id}
                                className={`sn-tier-option ${isSelected ? 'selected' : ''} ${unavailable ? 'disabled' : ''}`}
                                disabled={unavailable}
                                onClick={() => chooseTier(group.id, tier.id)}
                              >
                                <div className="sn-tier-head">
                                  <strong>{tier.label}</strong>
                                  <span>${tier.cost}/mo</span>
                                </div>
                                <div className="sn-tier-body">{tier.quick}</div>
                                <div className="sn-tier-meta">
                                  {tier.deductible && tier.deductible < 999999 ? (
                                    <span>Deductible ${tier.deductible}</span>
                                  ) : null}
                                  {typeof tier.payoutRate === 'number' && tier.payoutRate > 0 ? (
                                    <span>Payout {Math.round(tier.payoutRate * 100)}%</span>
                                  ) : null}
                                  {typeof tier.savingsBoost === 'number' &&
                                  tier.savingsBoost > 0 ? (
                                    <span>Savings +${tier.savingsBoost}</span>
                                  ) : null}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <button className="sn-primary sn-full" onClick={startMyths}>
              LOCK IN MY PLAN →
            </button>
          </div>
        </section>
      ) : null}

      {screen === 'screen-myth' && state.currentMyth ? (
        <section className="sn-screen">
          <div className="sn-content">
            <div className="sn-myth-shell">
              <div className="sn-step-pill alt">
                Myth Quiz {state.currentMythIndex + 1} of {state.currentMythSet.length} · Round{' '}
                {state.round + 1}
              </div>
              <div className="sn-myth-tags">Picked for your plan: {mythLabels.join(', ')}</div>
              <h2 className="sn-myth-question">&quot;{state.currentMyth.statement}&quot;</h2>
              <div className="sn-myth-actions">
                <button
                  className="sn-answer true"
                  onClick={() => answerMyth(true)}
                  disabled={state.mythSelection !== 'pending'}
                >
                  TRUE
                </button>
                <button
                  className="sn-answer false"
                  onClick={() => answerMyth(false)}
                  disabled={state.mythSelection !== 'pending'}
                >
                  FALSE
                </button>
                <button
                  className="sn-answer unsure"
                  onClick={() => answerMyth(null)}
                  disabled={state.mythSelection !== 'pending'}
                >
                  NOT SURE
                </button>
              </div>
              {state.mythSelection !== 'pending' ? (
                <div
                  className={`sn-feedback-card ${state.mythSelection === state.currentMyth.answer ? 'good' : 'bad'}`}
                >
                  <strong>
                    {state.mythSelection === state.currentMyth.answer
                      ? 'Correct!'
                      : state.mythSelection === null
                        ? 'Good question.'
                        : 'Actually...'}
                  </strong>
                  <p>{state.currentMyth.explanation}</p>
                  <div className="sn-feedback-next">
                    This myth connects to {mythLabels.join(', ')}.
                  </div>
                </div>
              ) : null}
              {state.mythSelection !== 'pending' ? (
                <div className="sn-result-actions sn-myth-next-actions">
                  <button className="sn-secondary" onClick={() => setModal('guide')}>
                    Open Coverage Guide
                  </button>
                  <button className="sn-primary" onClick={nextMyth}>
                    {state.currentMythIndex >= state.currentMythSet.length - 1
                      ? 'FACE THE EVENT →'
                      : 'NEXT MYTH →'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {screen === 'screen-event' && state.currentEvent ? (
        <section className="sn-screen">
          <div className="sn-content">
            <div className="sn-event-shell">
              <div className="sn-step-pill danger">
                Life Event · Round {state.round + 1} of {state.totalRounds}
              </div>
              <div className="sn-event-emoji">{state.currentEvent.emoji}</div>
              <h2>{state.currentEvent.title}</h2>
              <p>{state.currentEvent.desc}</p>
              <div className="sn-event-cost">
                Total Cost: ${state.currentEvent.totalCost.toLocaleString()}
              </div>
              <button className="sn-primary" onClick={resolveEvent}>
                SEE WHAT HAPPENS →
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {screen === 'screen-result' && state.currentEvent && state.lastOutcome ? (
        <section className="sn-screen">
          <div className="sn-content">
            <div className="sn-result-shell">
              <div className={`sn-result-banner ${state.lastOutcome.resultType}`}>
                <div className="sn-result-icon">{state.lastOutcome.resultIcon}</div>
                <div>
                  <h2>{state.lastOutcome.resultTitle}</h2>
                  <p>{state.currentEvent.title}</p>
                </div>
              </div>
              <div className="sn-breakdown-grid">
                <div>
                  <span>Total Incident Cost</span>
                  <strong className="redText">
                    ${state.lastOutcome.totalCost.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span>Insurance Paid</span>
                  <strong className="greenText">
                    ${state.lastOutcome.insurerPays.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span>You Paid</span>
                  <strong className={state.lastOutcome.youPay > 0 ? 'redText' : 'greenText'}>
                    ${state.lastOutcome.youPay.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span>Savings Remaining</span>
                  <strong className={state.savings < 200 ? 'redText' : 'greenText'}>
                    ${state.savings.toLocaleString()}
                  </strong>
                </div>
                {state.lastOutcome.addedDebt > 0 ? (
                  <div>
                    <span>Debt Added</span>
                    <strong className="redText">
                      ${state.lastOutcome.addedDebt.toLocaleString()}
                    </strong>
                  </div>
                ) : null}
                <div>
                  <span>Tier Used</span>
                  <strong>{state.lastOutcome.usedTierName}</strong>
                </div>
              </div>
              <p className="sn-result-copy">{state.lastOutcome.consequence}</p>
              <div className="sn-info-band warm">
                <span>Lesson Card</span>
                <strong>{state.currentEvent.lesson}</strong>
              </div>
              <div className="sn-info-band cool">
                <span>Better Option</span>
                <strong>{state.currentEvent.betterOption}</strong>
              </div>
              <div className="sn-info-band neutral">
                <span>Learn More</span>
                <strong>
                  For this event, your current {state.lastOutcome.relevantGroup} tier was{' '}
                  {selectedTier(state.lastOutcome.relevantGroup).label}. Tier quality changed your
                  deductible and payout strength.
                </strong>
              </div>
              <div className="sn-coach-shell">
                {!state.coachAdvice ? (
                  <button
                    className="sn-primary small"
                    onClick={coachMe}
                    disabled={state.coachLoading}
                  >
                    {state.coachLoading ? 'Loading Coach…' : 'Coach Me'}
                  </button>
                ) : (
                  <>
                    <div className="sn-coach-header">
                      <div>
                        <div className="sn-step-pill tiny">Coach Me</div>
                        <h3>What your plan did well, where it failed, and what to change next.</h3>
                      </div>
                      <div className="sn-result-actions">
                        <button
                          className="sn-secondary"
                          onClick={playCoachAudio}
                          disabled={state.coachAudioLoading}
                        >
                          {state.coachAudioLoading ? 'Playing…' : 'Listen'}
                        </button>
                        <button
                          className="sn-secondary"
                          onClick={coachMe}
                          disabled={state.coachLoading}
                        >
                          {state.coachLoading ? 'Refreshing…' : 'Refresh'}
                        </button>
                      </div>
                    </div>
                    <div className="sn-coach-grid">
                      <div className="sn-grade-card">
                        <div className={`sn-grade ${state.coachAdvice.gradeTone}`}>
                          {state.coachAdvice.planGrade}
                        </div>
                        <div className="sn-risk-meter">
                          <div className="sn-risk-row">
                            <span>Risk Level</span>
                            <span>{state.coachAdvice.riskLevel}/100</span>
                          </div>
                          <div className="sn-progress">
                            <div
                              className="sn-progress-fill gradient"
                              style={{ width: `${state.coachAdvice.riskLevel}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="sn-coach-main">
                        <div className="sn-metric-row">
                          <div className="sn-metric-card">
                            <span>Monthly Cost</span>
                            <strong>${state.coachAdvice.monthlyCost}</strong>
                          </div>
                          <div className="sn-metric-card">
                            <span>Upgrade Cost</span>
                            <strong>
                              {state.coachAdvice.extraMonthlyCost > 0
                                ? `+$${state.coachAdvice.extraMonthlyCost}`
                                : '$0'}
                            </strong>
                          </div>
                          <div className="sn-metric-card">
                            <span>Debt Saved</span>
                            <strong>${state.coachAdvice.estimatedDebtReduction}</strong>
                          </div>
                        </div>
                        <div className="sn-bill-split">
                          <div className="sn-risk-row">
                            <span>Bill Split</span>
                            <span>
                              {state.coachAdvice.insuranceShare}% insurance /{' '}
                              {state.coachAdvice.playerShare}% player
                            </span>
                          </div>
                          <div className="sn-progress split">
                            <div
                              className="sn-progress-fill green"
                              style={{ width: `${state.coachAdvice.insuranceShare}%` }}
                            />
                            <div
                              className="sn-progress-fill red"
                              style={{ width: `${state.coachAdvice.playerShare}%` }}
                            />
                          </div>
                        </div>
                        <div className="sn-coach-panels">
                          <div>
                            <span>Main Gap</span>
                            <strong>{state.coachAdvice.mainGap}</strong>
                          </div>
                          <div>
                            <span>Strongest Point</span>
                            <strong>{state.coachAdvice.strongestPoint}</strong>
                          </div>
                          <div>
                            <span>Money Impact</span>
                            <strong>{state.coachAdvice.moneyImpact}</strong>
                          </div>
                          <div>
                            <span>{state.coachAdvice.nextMoveLabel}</span>
                            <strong>{state.coachAdvice.nextMoveText}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                    <a
                      className="sn-statefarm-card sn-statefarm-link"
                      href={state.coachAdvice.stateFarmUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span>State Farm Match: </span>
                      <strong>{state.coachAdvice.stateFarmLabel}</strong>
                      <p>{state.coachAdvice.stateFarmNote}</p>
                      <div className="sn-statefarm-cta">{state.coachAdvice.stateFarmCta}</div>
                    </a>
                    <div className="sn-coach-source">{state.coachAdvice.sourceLabel}</div>
                  </>
                )}
              </div>
              <div className="sn-result-actions">
                <button className="sn-secondary" onClick={() => setModal('guide')}>
                  Open Coverage Guide
                </button>
                <button className="sn-primary" onClick={nextRound}>
                  {state.round + 1 >= state.totalRounds ? 'SEE FINAL SCORE →' : 'NEXT ROUND →'}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      {screen === 'screen-end' && persona ? (
        <section className="sn-screen">
          <div className="sn-content">
            <div className="sn-end-shell">
              <div className="sn-step-pill">
                {persona.emoji} {persona.name}
              </div>
              <div className="sn-final-grade" style={{ color: finalGrade.color }}>
                {finalGrade.grade}
              </div>
              <p className="sn-end-copy">
                {finalGrade.label}. You survived {state.totalRounds} rounds of real life.
              </p>
              <div className="sn-end-stats">
                <div>
                  <span>Savings Left</span>
                  <strong className={state.savings > 100 ? 'greenText' : 'redText'}>
                    ${state.savings.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span>Debt Added</span>
                  <strong className={state.debt > 0 ? 'redText' : 'greenText'}>
                    ${state.debt.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span>Myths Correct</span>
                  <strong>{state.mythCorrect}</strong>
                </div>
                <div>
                  <span>Monthly Spend</span>
                  <strong>${state.monthlySpent}</strong>
                </div>
              </div>
              {comparisons.length ? (
                <div className="sn-chart-shell">
                  <div className="sn-chart-head">
                    <h3>3-Round Comparison</h3>
                    <div className="sn-tabs compact">
                      <button
                        className={`sn-tab ${state.endChartMode === 'metric' ? 'active' : ''}`}
                        onClick={() => setState((prev) => ({ ...prev, endChartMode: 'metric' }))}
                      >
                        By Metric
                      </button>
                      <button
                        className={`sn-tab ${state.endChartMode === 'plan' ? 'active' : ''}`}
                        onClick={() => setState((prev) => ({ ...prev, endChartMode: 'plan' }))}
                      >
                        By Plan
                      </button>
                    </div>
                  </div>
                  {state.endChartMode === 'plan' ? (
                    <div className="sn-plan-chart">
                      {comparisons.map((comparison) => (
                        <div key={comparison.key} className="sn-chart-card">
                          <strong>{comparison.label}</strong>
                          <span>${comparison.result.monthlyCost}/mo</span>
                          <div className="sn-bar-columns">
                            {[
                              {
                                label: 'Debt',
                                value: comparison.result.avgDebt,
                                max: maxDebt,
                                className: 'red',
                              },
                              {
                                label: 'Savings',
                                value: comparison.result.avgSavings,
                                max: maxSavings,
                                className: 'green',
                              },
                              {
                                label: 'OOP',
                                value: comparison.result.avgOutOfPocket,
                                max: maxOutOfPocket,
                                className: 'gold',
                              },
                            ].map((metric) => (
                              <div key={metric.label} className="sn-bar-column">
                                <div className="sn-bar-well">
                                  <div
                                    className={`sn-bar-vertical ${metric.className}`}
                                    style={{
                                      height: `${Math.max(10, (metric.value / metric.max) * 100)}%`,
                                    }}
                                  />
                                </div>
                                <em>${metric.value}</em>
                                <span>{metric.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="sn-metric-chart">
                      {[
                        {
                          key: 'avgDebt',
                          title: 'Debt',
                          subtitle: 'Lower is better',
                          max: maxDebt,
                        },
                        {
                          key: 'avgSavings',
                          title: 'Savings',
                          subtitle: 'Higher is better',
                          max: maxSavings,
                        },
                        {
                          key: 'avgOutOfPocket',
                          title: 'Out of Pocket',
                          subtitle: 'Lower is better',
                          max: maxOutOfPocket,
                        },
                      ].map((metric) => (
                        <div key={metric.key} className="sn-chart-card">
                          <strong>{metric.title}</strong>
                          <span>{metric.subtitle}</span>
                          <div className="sn-bar-columns five">
                            {comparisons.map((comparison) => {
                              const value = comparison.result[
                                metric.key as keyof typeof comparison.result
                              ] as number
                              const tone =
                                comparison.key === 'player'
                                  ? 'blue'
                                  : comparison.key === 'no-plan'
                                    ? 'red'
                                    : comparison.key === 'cheap'
                                      ? 'gold'
                                      : comparison.key === 'balanced'
                                        ? 'green'
                                        : 'purple'
                              return (
                                <div
                                  key={`${metric.key}-${comparison.key}`}
                                  className="sn-bar-column"
                                >
                                  <div className="sn-bar-well">
                                    <div
                                      className={`sn-bar-vertical ${tone}`}
                                      style={{
                                        height: `${Math.max(10, (value / metric.max) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                  <em>${value}</em>
                                  <span>{comparison.label}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="sn-chart-notes">
                    {bestDebt ? <span>Lowest average debt: {bestDebt.label}</span> : null}
                    {bestSavings ? <span>Highest average savings: {bestSavings.label}</span> : null}
                    <span>Your monthly cost: ${comparisons[0]?.result.monthlyCost || 0}</span>
                  </div>
                </div>
              ) : null}
              {state.lessonsLearned.length ? (
                <div className="sn-lessons">
                  <span>Knowledge Cards Collected</span>
                  {state.lessonsLearned.map((lesson, index) => (
                    <div key={`${lesson}-${index}`}>{lesson}</div>
                  ))}
                </div>
              ) : null}
              <div className="sn-result-actions">
                <button className="sn-primary" onClick={replay}>
                  PLAY AGAIN →
                </button>
                <button className="sn-secondary" onClick={chooseDifferentPersona}>
                  Try a different persona
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {modal !== 'none' ? (
        <div className="sn-modal-wrap" onClick={() => setModal('none')}>
          <div className="sn-modal" onClick={(event) => event.stopPropagation()}>
            <button className="sn-modal-close" onClick={() => setModal('none')}>
              ✕
            </button>
            {modal === 'how' ? (
              <>
                <h3>How to Play</h3>
                {[
                  'Pick a persona. Your character sets your monthly budget and starting savings.',
                  'Choose insurance tiers. Cheap plans save money now, but may fail later.',
                  'Answer a myth card and learn the common mistakes people make about insurance.',
                  'Face a life event. The game checks your tier strength, deductible, and payout quality.',
                  'Compare your outcome with benchmark strategies after 3 rounds.',
                ].map((text, index) => (
                  <div key={text} className="sn-help-row">
                    <strong>{index + 1}</strong>
                    <span>{text}</span>
                  </div>
                ))}
              </>
            ) : null}
            {modal === 'guide' ? (
              <>
                <h3>Coverage Guide</h3>
                <p className="sn-guide-intro">
                  Flip any coverage card to compare all tiers side by side.
                </p>
                <div className="sn-guide-grid">
                  {INSURANCE_GROUPS.map((group) => {
                    const isFlipped = guideFlippedCards[group.id]
                    const defaultTier = group.tiers[0]
                    return (
                      <div key={group.id} className={`sn-guide-flip ${isFlipped ? 'flipped' : ''}`}>
                        <div className="sn-guide-inner">
                          <div className="sn-guide-face sn-guide-front">
                            <div className="sn-card-top">
                              <div>
                                <strong>
                                  {group.icon} {group.name}
                                </strong>
                                <p>{group.summary}</p>
                              </div>
                              <button
                                className="sn-flip-btn"
                                onClick={() =>
                                  setGuideFlippedCards((prev) => ({ ...prev, [group.id]: true }))
                                }
                              >
                                Flip
                              </button>
                            </div>
                            <div className="sn-guide-highlight">
                              <span>Starts At</span>
                              <strong>{defaultTier.label}</strong>
                              <em>${defaultTier.cost}/mo</em>
                            </div>
                            <div className="sn-guide-tip">Teen tip: {defaultTier.teenTip}</div>
                          </div>
                          <div className="sn-guide-face sn-guide-back">
                            <div className="sn-card-top">
                              <strong>
                                {group.icon} {group.name}
                              </strong>
                              <button
                                className="sn-flip-btn"
                                onClick={() =>
                                  setGuideFlippedCards((prev) => ({ ...prev, [group.id]: false }))
                                }
                              >
                                Back
                              </button>
                            </div>
                            {group.tiers.map((tier) => (
                              <div key={tier.id} className="sn-guide-tier">
                                <div className="sn-tier-head">
                                  <strong>{tier.label}</strong>
                                  <span>${tier.cost}/mo</span>
                                </div>
                                <div>{tier.whatItIs}</div>
                                <div className="sn-guide-tip">Teen tip: {tier.teenTip}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .sn-root {
          --bg: #f5efe6;
          --paper: #fbf8f2;
          --card: #fffdf9;
          --card-soft: #f3ede2;
          --ink: #33251b;
          --muted: #9a836a;
          --line: #e3d6c3;
          --orange: #ef8a4b;
          --orange-deep: #cc6730;
          --blue: #8cc5f0;
          --green: #86d69f;
          --pink: #ee96be;
          --yellow: #f4d76f;
          --shadow: 0 4px 0 rgba(117, 97, 73, 0.4), 0 18px 34px rgba(60, 35, 10, 0.08);
          background:
            radial-gradient(circle at top left, rgba(239, 138, 75, 0.12), transparent 22%),
            radial-gradient(circle at bottom right, rgba(140, 197, 240, 0.12), transparent 22%),
            var(--bg);
          color: var(--ink);
          border-radius: 28px;
          overflow: hidden;
          position: relative;
        }
        .sn-root:before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(51, 37, 27, 0.08) 1px, transparent 1px);
          background-size: 18px 18px;
          opacity: 0.22;
          pointer-events: none;
        }
        .sn-screen {
          position: relative;
          z-index: 1;
          min-height: 880px;
          padding: 96px 28px 48px;
        }
        .sn-content {
          max-width: 1300px;
          margin: 0 auto;
        }
        .sn-title-screen {
          display: grid;
          place-items: center;
          background: linear-gradient(180deg, #f9f2e8 0%, #efe4d3 100%);
        }
        .sn-title-shell {
          max-width: 760px;
          text-align: center;
          padding: 32px 16px;
        }
        .sn-step-pill {
          display: inline-block;
          padding: 8px 18px;
          border-radius: 999px;
          background: rgba(239, 138, 75, 0.15);
          color: var(--orange);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 3px;
          text-transform: uppercase;
        }
        .sn-step-pill.alt {
          background: rgba(244, 215, 111, 0.28);
          color: #8b6900;
        }
        .sn-step-pill.danger {
          background: rgba(238, 150, 190, 0.2);
          color: #b53b73;
        }
        .sn-step-pill.tiny {
          font-size: 11px;
          padding: 6px 14px;
        }
        .sn-title-logo,
        .sn-top h2,
        .sn-result-shell h2,
        .sn-event-shell h2,
        .sn-myth-question,
        .sn-final-grade {
          font-family: Georgia, 'Times New Roman', serif;
          font-weight: 900;
          letter-spacing: -0.03em;
        }
        .sn-title-logo {
          font-size: clamp(64px, 10vw, 118px);
          line-height: 0.92;
          margin: 18px 0 16px;
        }
        .sn-title-logo span {
          color: var(--orange);
        }
        .sn-lead,
        .sn-top p,
        .sn-card-copy,
        .sn-result-copy,
        .sn-event-shell p,
        .sn-guide-card p,
        .sn-guide-intro {
          font-size: 18px;
          line-height: 1.6;
          color: #6f5a47;
        }
        .sn-title-cards {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin: 32px 0;
        }
        .sn-title-cards div {
          width: 82px;
          height: 112px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          font-size: 34px;
          box-shadow:
            var(--shadow),
            inset 0 2px 0 rgba(255, 255, 255, 0.75);
          animation: float 3s ease-in-out infinite;
        }
        .sn-title-cards div:nth-child(1) {
          background: var(--blue);
          transform: rotate(-9deg);
        }
        .sn-title-cards div:nth-child(2) {
          background: var(--orange);
          transform: rotate(-4deg);
          animation-delay: 0.15s;
        }
        .sn-title-cards div:nth-child(3) {
          background: var(--green);
          transform: rotate(4deg);
          animation-delay: 0.3s;
        }
        .sn-title-cards div:nth-child(4) {
          background: var(--yellow);
          transform: rotate(10deg);
          animation-delay: 0.45s;
        }
        @keyframes float {
          0%,
          100% {
            translate: 0 0;
          }
          50% {
            translate: 0 -10px;
          }
        }
        .sn-stack-actions,
        .sn-result-actions,
        .sn-tabs,
        .sn-chart-notes {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .sn-stack-actions {
          justify-content: center;
          flex-direction: column;
          max-width: 320px;
          margin: 0 auto;
        }
        .sn-primary,
        .sn-secondary,
        .sn-tab,
        .sn-answer,
        .sn-flip-btn,
        .sn-modal-close {
          border: none;
          cursor: pointer;
          transition:
            transform 0.14s ease,
            box-shadow 0.14s ease,
            background 0.14s ease;
        }
        .sn-primary:hover,
        .sn-secondary:hover,
        .sn-tab:hover,
        .sn-answer:hover,
        .sn-flip-btn:hover,
        .sn-persona-card:hover,
        .sn-tier-option:hover,
        .sn-statefarm-link:hover {
          transform: translateY(-2px);
        }
        .sn-primary {
          background: var(--orange);
          color: #fff;
          padding: 16px 28px;
          border-radius: 999px;
          font-weight: 900;
          letter-spacing: 0.04em;
          box-shadow:
            0 4px 0 var(--orange-deep),
            0 12px 24px rgba(239, 138, 75, 0.28);
        }
        .sn-primary.small {
          width: fit-content;
        }
        .sn-secondary,
        .sn-tab,
        .sn-flip-btn,
        .sn-modal-close {
          background: var(--card);
          color: var(--ink);
          padding: 13px 18px;
          border-radius: 999px;
          font-weight: 800;
          box-shadow:
            0 3px 0 rgba(117, 97, 73, 0.34),
            0 12px 22px rgba(60, 35, 10, 0.06);
        }
        .sn-full {
          width: 100%;
        }
        .sn-top {
          margin-bottom: 26px;
        }
        .sn-top h2 {
          font-size: 52px;
          margin: 14px 0 8px;
        }
        .sn-persona-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
          align-items: start;
        }
        .sn-persona-card {
          text-align: left;
          background: var(--card);
          border-radius: 30px;
          padding: 28px;
          border-top: 7px solid var(--orange);
          box-shadow:
            var(--shadow),
            inset 0 2px 0 rgba(255, 255, 255, 0.86);
          transition:
            box-shadow 0.18s ease,
            border-top-color 0.18s ease;
        }
        .sn-persona-card:hover {
          box-shadow:
            0 8px 0 rgba(117, 97, 73, 0.5),
            0 24px 48px rgba(60, 35, 10, 0.18),
            inset 0 2px 0 rgba(255, 255, 255, 0.86);
          border-top-color: var(--orange-deep);
        }
        .sn-persona-emoji {
          font-size: 50px;
          margin-bottom: 12px;
        }
        .sn-persona-card h3 {
          margin: 0 0 8px;
          font-size: 30px;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .sn-persona-card p {
          margin: 0 0 18px;
          color: #6f5a47;
          line-height: 1.5;
          font-size: 18px;
        }
        .sn-persona-stats {
          display: grid;
          gap: 10px;
          margin-bottom: 18px;
        }
        .sn-persona-stats div {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 17px;
        }
        .sn-persona-stats span {
          color: var(--muted);
          font-weight: 700;
        }
        .sn-persona-stats strong {
          font-size: 18px;
        }
        .sn-risk-pill {
          border-radius: 14px;
          padding: 12px 14px;
          background: linear-gradient(
            90deg,
            rgba(134, 214, 159, 0.95),
            rgba(244, 215, 111, 0.95),
            rgba(239, 138, 75, 0.95)
          );
          color: #6f2714;
          font-weight: 800;
          font-size: 15px;
        }
        .sn-hud {
          position: sticky;
          top: 0;
          z-index: 4;
          display: flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(227, 214, 195, 0.6);
          background: rgba(251, 248, 242, 0.9);
          backdrop-filter: blur(14px);
        }
        .sn-hud-pill {
          padding: 10px 16px;
          border-radius: 999px;
          background: rgba(239, 138, 75, 0.14);
          color: var(--orange);
          font-weight: 900;
        }
        .sn-hud-spacer {
          flex: 1;
        }
        .sn-hud-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 84px;
        }
        .sn-hud-stat span,
        .sn-hud-meter span,
        .sn-budget-card span,
        .sn-breakdown-grid span,
        .sn-info-band span,
        .sn-coach-panels span,
        .sn-metric-card span,
        .sn-chart-card span,
        .sn-end-stats span,
        .sn-lessons span {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--muted);
          font-weight: 900;
        }
        .sn-hud-stat strong,
        .sn-breakdown-grid strong,
        .sn-metric-card strong,
        .sn-coach-panels strong,
        .sn-end-stats strong {
          font-size: 18px;
        }
        .sn-hud-meter {
          min-width: 180px;
          flex: 1;
        }
        .sn-progress {
          display: flex;
          height: 12px;
          overflow: hidden;
          border-radius: 999px;
          margin-top: 6px;
          background: rgba(96, 70, 42, 0.08);
        }
        .sn-progress-fill {
          height: 100%;
        }
        .sn-progress-fill.green {
          background: linear-gradient(90deg, #68bf84, #9ae1af);
        }
        .sn-progress-fill.red {
          background: linear-gradient(90deg, #dc6b5b, #ef9886);
        }
        .sn-progress-fill.gradient {
          background: linear-gradient(90deg, #68bf84, #f4d76f, #ef8a4b, #d94f3d);
        }
        .sn-protection-toolbar {
          display: flex;
          gap: 18px;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }
        .sn-budget-card {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          padding: 18px 20px;
          border-radius: 22px;
          background: var(--card);
          min-width: min(100%, 480px);
          box-shadow:
            var(--shadow),
            inset 0 2px 0 rgba(255, 255, 255, 0.86);
        }
        .sn-budget-card strong {
          display: block;
          margin-top: 6px;
          font-size: 30px;
        }
        .sn-tabs {
          margin-bottom: 22px;
        }
        .sn-tabs.compact {
          margin: 0;
        }
        .sn-tab.active {
          background: var(--orange);
          color: #fff;
          box-shadow:
            0 4px 0 var(--orange-deep),
            0 10px 20px rgba(239, 138, 75, 0.24);
        }
        .sn-tab span {
          margin-left: 8px;
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.2);
          font-size: 10px;
        }
        .sn-coverage-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
          margin-bottom: 28px;
        }
        .sn-flip-card,
        .sn-guide-flip {
          perspective: 1200px;
        }
        .sn-flip-card {
          height: 420px;
          min-height: 420px;
        }
        .sn-guide-flip {
          min-height: 500px;
        }
        .sn-flip-inner,
        .sn-guide-inner {
          position: relative;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.5s ease;
        }
        .sn-flip-inner {
          height: 420px;
          min-height: 420px;
        }
        .sn-guide-inner {
          min-height: 500px;
        }
        .sn-flip-card.flipped .sn-flip-inner,
        .sn-guide-flip.flipped .sn-guide-inner {
          transform: rotateY(180deg);
        }
        .sn-card-face,
        .sn-guide-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          overflow: hidden;
          border-radius: 30px;
          padding: 22px;
          background: var(--card);
          box-shadow:
            var(--shadow),
            inset 0 2px 0 rgba(255, 255, 255, 0.86);
          display: flex;
          flex-direction: column;
        }
        .sn-card-back,
        .sn-guide-back {
          transform: rotateY(180deg);
        }
        .sn-card-front {
          padding: 16px;
          display: grid;
          grid-template-rows: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 0.95fr) minmax(0, 0.9fr);
          gap: 10px;
          align-content: stretch;
          height: 100%;
        }
        .sn-card-top {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
        }
        .sn-card-title {
          font-size: 28px;
          font-family: Georgia, 'Times New Roman', serif;
          font-weight: 900;
          margin-bottom: 8px;
        }
        .sn-card-copy {
          margin: 0;
        }
        .sn-card-front .sn-card-top > div {
          display: grid;
          gap: 8px;
          align-content: start;
        }
        .sn-card-front .sn-card-title {
          font-size: 20px;
          margin-bottom: 2px;
        }
        .sn-card-front .sn-card-copy {
          font-size: 13px;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .sn-current-tier,
        .sn-current-copy,
        .sn-current-tip,
        .sn-front-footer {
          margin-top: 16px;
        }
        .sn-card-front .sn-current-tier,
        .sn-card-front .sn-current-copy,
        .sn-card-front .sn-current-tip {
          margin-top: 0;
          min-height: 0;
        }
        .sn-card-front .sn-current-tier,
        .sn-card-front .sn-current-copy,
        .sn-card-front .sn-current-tip {
          padding: 13px;
          display: grid;
          align-content: start;
        }
        .sn-card-front .sn-current-tier strong {
          font-size: 17px;
          line-height: 1.2;
        }
        .sn-card-front .sn-current-copy,
        .sn-card-front .sn-current-tip {
          font-size: 13px;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .sn-card-front .sn-current-tip {
          -webkit-line-clamp: 2;
        }
        .sn-current-tier,
        .sn-guide-highlight {
          background: rgba(244, 215, 111, 0.18);
          border-radius: 18px;
          padding: 16px;
          display: grid;
          gap: 6px;
        }
        .sn-current-tier strong,
        .sn-guide-highlight strong {
          font-size: 26px;
        }
        .sn-current-tier em,
        .sn-guide-highlight em {
          font-style: normal;
          color: var(--orange);
          font-weight: 900;
        }
        .sn-current-copy {
          padding: 16px;
          border-radius: 18px;
          background: rgba(140, 197, 240, 0.12);
          line-height: 1.55;
          color: #5e4b3a;
        }
        .sn-current-tip,
        .sn-guide-tip {
          padding: 16px;
          border-radius: 18px;
          background: rgba(134, 214, 159, 0.14);
          line-height: 1.55;
          color: #4f473d;
          font-weight: 700;
        }
        .sn-front-footer {
          margin-top: auto;
          padding-top: 12px;
          color: var(--muted);
          font-weight: 700;
        }
        .sn-tier-stack {
          display: grid;
          gap: 12px;
          margin-top: 18px;
          overflow: auto;
          padding-right: 4px;
        }
        .sn-tier-option {
          text-align: left;
          background: #f3ede2;
          border-radius: 18px;
          padding: 16px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
        }
        .sn-tier-option.selected {
          background: rgba(134, 214, 159, 0.18);
          outline: 2px solid #68bf84;
        }
        .sn-tier-option.disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .sn-tier-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }
        .sn-tier-head strong,
        .sn-tier-head span {
          font-size: 19px;
        }
        .sn-tier-head span {
          font-weight: 900;
          color: var(--orange);
        }
        .sn-tier-body {
          margin: 10px 0 12px;
          color: #66513e;
          line-height: 1.5;
        }
        .sn-tier-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .sn-tier-meta span {
          padding: 7px 12px;
          border-radius: 999px;
          background: var(--card);
          font-weight: 800;
          font-size: 13px;
        }
        .sn-myth-shell,
        .sn-event-shell,
        .sn-result-shell,
        .sn-end-shell {
          background: var(--card);
          border-radius: 34px;
          padding: 30px;
          box-shadow:
            var(--shadow),
            inset 0 2px 0 rgba(255, 255, 255, 0.86);
        }
        .sn-myth-shell,
        .sn-event-shell {
          max-width: 1040px;
          margin: 0 auto;
          text-align: center;
        }
        .sn-myth-tags {
          margin: 14px 0 10px;
          color: var(--muted);
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-size: 13px;
        }
        .sn-myth-question {
          font-size: clamp(26px, 3.2vw, 36px);
          line-height: 1.15;
          margin: 0 0 22px;
        }
        .sn-myth-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .sn-answer {
          padding: 16px 24px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 16px;
          box-shadow: var(--shadow);
        }
        .sn-answer.true {
          background: var(--green);
          color: #225235;
        }
        .sn-answer.false {
          background: var(--pink);
          color: #6a2143;
        }
        .sn-answer.unsure {
          background: var(--yellow);
          color: #6b5300;
        }
        .sn-feedback-card {
          margin-top: 24px;
          padding: 22px;
          border-radius: 22px;
          text-align: left;
        }
        .sn-feedback-card.good {
          background: rgba(134, 214, 159, 0.16);
          border: 2px solid rgba(104, 191, 132, 0.5);
        }
        .sn-feedback-card.bad {
          background: rgba(238, 150, 190, 0.14);
          border: 2px solid rgba(181, 59, 115, 0.35);
        }
        .sn-feedback-card strong {
          display: block;
          margin-bottom: 8px;
          font-size: 20px;
        }
        .sn-feedback-card p {
          margin: 0;
          line-height: 1.6;
          color: #5f4f41;
        }
        .sn-feedback-next {
          margin-top: 12px;
          font-weight: 800;
          color: #6a5a48;
        }
        .sn-myth-next-actions {
          margin-top: 18px;
        }
        .sn-event-emoji,
        .sn-result-icon {
          font-size: 64px;
          margin: 10px 0 12px;
        }
        .sn-event-cost {
          margin: 20px 0 24px;
          font-size: 34px;
          font-weight: 900;
          color: var(--orange);
        }
        .sn-result-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          border-radius: 24px;
          padding: 18px 20px;
          margin-bottom: 20px;
          text-align: center;
        }
        .sn-result-banner.good {
          background: rgba(134, 214, 159, 0.18);
        }
        .sn-result-banner.neutral {
          background: rgba(244, 215, 111, 0.2);
        }
        .sn-result-banner.bad {
          background: rgba(238, 150, 190, 0.16);
        }
        .sn-breakdown-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }
        .sn-breakdown-grid > div,
        .sn-metric-card,
        .sn-coach-panels > div,
        .sn-end-stats > div,
        .sn-chart-card,
        .sn-guide-card {
          background: var(--card-soft);
          border-radius: 20px;
          padding: 16px;
        }
        .sn-result-copy {
          margin: 0 0 16px;
        }
        .sn-info-band {
          display: grid;
          gap: 8px;
          border-radius: 20px;
          padding: 18px 20px;
          margin-bottom: 14px;
        }
        .sn-info-band.warm {
          background: rgba(244, 215, 111, 0.18);
        }
        .sn-info-band.cool {
          background: rgba(140, 197, 240, 0.16);
        }
        .sn-info-band.neutral {
          background: rgba(227, 214, 195, 0.36);
        }
        .sn-coach-shell {
          margin: 18px 0 22px;
          background: linear-gradient(180deg, rgba(140, 197, 240, 0.12), rgba(134, 214, 159, 0.12));
          border-radius: 26px;
          padding: 22px;
          border: 1px solid rgba(140, 197, 240, 0.3);
        }
        .sn-coach-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 18px;
        }
        .sn-coach-header h3 {
          margin: 10px 0 0;
          font-size: 28px;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .sn-coach-grid {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 18px;
        }
        .sn-grade-card,
        .sn-bill-split,
        .sn-statefarm-card {
          background: rgba(255, 255, 255, 0.7);
          border-radius: 22px;
          padding: 18px;
          box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.82);
        }
        .sn-statefarm-link {
          display: block;
          color: inherit;
          text-decoration: none;
        }
        .sn-grade {
          width: 110px;
          height: 110px;
          border-radius: 28px;
          display: grid;
          place-items: center;
          margin: 0 auto 18px;
          font-size: 52px;
          font-weight: 900;
          color: #fff;
        }
        .sn-grade.good {
          background: linear-gradient(135deg, #68bf84, #9ae1af);
        }
        .sn-grade.mid {
          background: linear-gradient(135deg, #f4d76f, #ffe899);
          color: #6e5600;
        }
        .sn-grade.bad {
          background: linear-gradient(135deg, #d94f3d, #ef8f7d);
        }
        .sn-risk-meter {
          display: grid;
          gap: 10px;
        }
        .sn-risk-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-weight: 800;
        }
        .sn-coach-main {
          display: grid;
          gap: 16px;
        }
        .sn-metric-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .sn-bill-split {
          display: grid;
          gap: 10px;
        }
        .sn-progress.split {
          height: 14px;
        }
        .sn-coach-panels {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .sn-statefarm-card {
          margin-top: 16px;
          border: 1px solid rgba(239, 138, 75, 0.24);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(244, 215, 111, 0.14));
        }
        .sn-statefarm-card p {
          margin: 10px 0 12px;
          color: #5e4b3a;
          line-height: 1.55;
        }
        .sn-statefarm-cta {
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(239, 138, 75, 0.12);
          font-weight: 800;
          color: #8b4a1f;
        }
        .sn-coach-source {
          margin-top: 14px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 700;
        }
        .sn-final-grade {
          font-size: 120px;
          line-height: 1;
          text-align: center;
          margin: 12px 0;
        }
        .sn-end-copy {
          text-align: center;
          font-size: 20px;
          color: #68513c;
          margin-bottom: 20px;
        }
        .sn-end-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }
        .sn-chart-shell {
          background: rgba(255, 255, 255, 0.6);
          border-radius: 26px;
          padding: 22px;
          margin-bottom: 22px;
        }
        .sn-chart-head {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: center;
          margin-bottom: 16px;
        }
        .sn-chart-head h3 {
          margin: 0;
          font-size: 28px;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .sn-plan-chart,
        .sn-metric-chart {
          display: grid;
          gap: 16px;
        }
        .sn-plan-chart {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }
        .sn-metric-chart {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .sn-bar-columns {
          display: flex;
          align-items: end;
          gap: 10px;
          min-height: 220px;
          margin-top: 16px;
        }
        .sn-bar-columns.five .sn-bar-column {
          min-width: 0;
        }
        .sn-bar-column {
          flex: 1;
          text-align: center;
        }
        .sn-bar-well {
          height: 150px;
          display: flex;
          align-items: end;
          margin-bottom: 8px;
        }
        .sn-bar-vertical {
          width: 100%;
          min-height: 10px;
          border-radius: 18px 18px 8px 8px;
        }
        .sn-bar-vertical.red {
          background: linear-gradient(180deg, #ef8f7d, #d94f3d);
        }
        .sn-bar-vertical.green {
          background: linear-gradient(180deg, #9ae1af, #68bf84);
        }
        .sn-bar-vertical.gold {
          background: linear-gradient(180deg, #ffe89a, #f4d76f);
        }
        .sn-bar-vertical.blue {
          background: linear-gradient(180deg, #aad8fa, #5b9bd5);
        }
        .sn-bar-vertical.purple {
          background: linear-gradient(180deg, #ccb8ff, #8e75e7);
        }
        .sn-bar-column em {
          display: block;
          font-style: normal;
          font-weight: 900;
          margin-bottom: 4px;
        }
        .sn-chart-notes span {
          padding: 8px 12px;
          border-radius: 999px;
          background: var(--card);
          font-weight: 800;
        }
        .sn-lessons {
          display: grid;
          gap: 10px;
          background: rgba(255, 255, 255, 0.58);
          border-radius: 24px;
          padding: 18px;
          margin-bottom: 20px;
        }
        .sn-lessons > div {
          background: rgba(244, 215, 111, 0.18);
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 700;
        }
        .sn-modal-wrap {
          position: fixed;
          inset: 0;
          z-index: 20;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(36, 22, 10, 0.48);
          backdrop-filter: blur(6px);
        }
        .sn-modal {
          width: min(1200px, 100%);
          max-height: 84vh;
          overflow: auto;
          background: var(--paper);
          border-radius: 30px;
          padding: 28px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.22);
        }
        .sn-modal h3 {
          margin: 0 0 18px;
          font-size: 32px;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .sn-modal-close {
          float: right;
          width: 42px;
          height: 42px;
          padding: 0;
        }
        .sn-help-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          background: var(--card);
          border-radius: 18px;
          padding: 14px;
          margin-bottom: 10px;
        }
        .sn-help-row strong {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(239, 138, 75, 0.14);
          color: var(--orange);
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .sn-guide-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .sn-guide-intro {
          margin: -4px 0 18px;
        }
        .sn-guide-tier {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed var(--line);
          display: grid;
          gap: 6px;
          color: #5e4937;
        }
        .sn-guide-tip {
          color: var(--muted);
          font-weight: 800;
        }
        .redText {
          color: #d94f3d;
        }
        .greenText {
          color: #4da66b;
        }
        @media (max-width: 1180px) {
          .sn-persona-grid,
          .sn-coverage-grid,
          .sn-guide-grid,
          .sn-plan-chart {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .sn-flip-card,
          .sn-flip-inner {
            height: 405px;
            min-height: 405px;
          }
        }
        @media (max-width: 920px) {
          .sn-screen {
            min-height: auto;
            padding: 88px 18px 32px;
          }
          .sn-top h2 {
            font-size: 40px;
          }
          .sn-myth-question {
            font-size: 40px;
          }
          .sn-breakdown-grid,
          .sn-end-stats,
          .sn-metric-row,
          .sn-coach-panels,
          .sn-metric-chart,
          .sn-guide-grid,
          .sn-coach-grid {
            grid-template-columns: 1fr;
          }
          .sn-budget-card {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 720px) {
          .sn-persona-grid,
          .sn-coverage-grid,
          .sn-plan-chart,
          .sn-guide-grid {
            grid-template-columns: 1fr;
          }
          .sn-flip-card,
          .sn-flip-inner {
            height: 375px;
            min-height: 375px;
          }
          .sn-card-front {
            padding: 14px;
            gap: 8px;
          }
          .sn-card-front .sn-card-title {
            font-size: 19px;
          }
          .sn-chart-head,
          .sn-protection-toolbar,
          .sn-coach-header {
            flex-direction: column;
            align-items: stretch;
          }
          .sn-title-logo {
            font-size: 72px;
          }
        }
      `}</style>
    </div>
  )
}

export default InsuranceCardGame
