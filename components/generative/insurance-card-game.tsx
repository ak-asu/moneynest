'use client'
import { useState } from 'react'
import { callClaude } from '@/lib/ai/chat'

type InsuranceScreen =
  | 'screen-title'
  | 'screen-persona'
  | 'screen-protection'
  | 'screen-myth'
  | 'screen-event'
  | 'screen-result'
  | 'screen-end'

type InsurancePersona = {
  id: string
  emoji: string
  name: string
  desc: string
  budget: number
  savings: number
  riskBoost: string[]
}

type InsuranceTier = {
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
  [key: string]: string | number | boolean | string[] | undefined
}

type InsuranceGroup = {
  id: string
  category: string
  icon: string
  name: string
  summary: string
  tiers: InsuranceTier[]
}

type InsuranceEvent = {
  id: string
  emoji: string
  title: string
  desc: string
  totalCost: number
  type: string
  lesson: string
  betterOption: string
}

type InsuranceMythCard = {
  id: string
  statement: string
  answer: boolean
  explanation: string
  tags: string[]
}

type InsuranceCoachAdvice = {
  summary: string
  riskLevel: number
  planGrade: string
  gradeTone: string
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
  stateFarmUrl: string
  stateFarmNote: string
}

type InsurancePlanMap = Record<string, string>

interface InsuranceGameState {
  persona: InsurancePersona | null
  selectedPlans: InsurancePlanMap
  monthlySpent: number
  savings: number
  debt: number
  round: number
  totalRounds: number
  currentMyth: InsuranceMythCard | null
  currentMythSet: InsuranceMythCard[]
  currentMythIndex: number
  currentEvent: InsuranceEvent | null
  mythCorrect: number
  mythWrong: number
  lessonsLearned: string[]
  initialSavings: number
  activeCategory: string
  usedMythIds: string[]
  usedEventIds: string[]
  lastScreenBeforeGuide: InsuranceScreen
  lastRoundResultHtml: string
  lastOutcome: string | null
  coachAdviceHtml: string
  coachLoading: boolean
  coachAudioLoading: boolean
  currentCoachSpeechText: string
  endChartMode: string
}

const initialState: InsuranceGameState = {
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
  lessonsLearned: [],
  initialSavings: 0,
  activeCategory: 'all',
  usedMythIds: [],
  usedEventIds: [],
  lastScreenBeforeGuide: 'screen-title',
  lastRoundResultHtml: '',
  lastOutcome: null,
  coachAdviceHtml: '',
  coachLoading: false,
  coachAudioLoading: false,
  currentCoachSpeechText: '',
  endChartMode: 'metric'
}

function InsuranceCardGame() {
  const [currentScreen, setCurrentScreen] = useState<InsuranceScreen>('screen-title')
  const [state, setState] = useState<InsuranceGameState>(initialState)

  // Data definitions
  const PERSONAS = [
    { id: 'first-car', emoji: '🚗', name: 'First Car Teen', desc: 'Just got your license and your first used car.', budget: 120, savings: 700, riskBoost: ['auto'] },
    { id: 'dorm-student', emoji: '🎒', name: 'Dorm Student', desc: 'Living in campus housing, managing everything on your own.', budget: 70, savings: 300, riskBoost: ['renters', 'health'] },
    { id: 'first-apartment', emoji: '🏠', name: 'First Apartment Renter', desc: 'Moved out, paying rent, figuring out adulthood.', budget: 90, savings: 500, riskBoost: ['renters', 'health'] },
    { id: 'part-time', emoji: '💼', name: 'Part-Time Worker', desc: 'Juggling school and work, no employer benefits.', budget: 80, savings: 400, riskBoost: ['health', 'auto'] },
    { id: 'teen-athlete', emoji: '⚽', name: 'Teen Athlete', desc: 'Competing regularly, higher chance of injuries.', budget: 100, savings: 550, riskBoost: ['health'] }
  ]

  const INSURANCE_GROUPS = [
    {
      id: 'auto',
      category: 'auto',
      icon: '🚗',
      name: 'Auto Insurance',
      summary: 'This group changes whether your car, someone else\'s car, theft, and uninsured-driver accidents are paid for.',
      tiers: [
        { id: 'none', label: 'No Auto Plan', cost: 0, deductible: 999999, payoutRate: 0, liability: false, collision: false, comprehensive: false, uninsured: false, quick: 'You save money now, but any car-related event can hit you hard.', pitfall: 'No help for crashes, theft, glass, or uninsured drivers.', whatItIs: 'No monthly cost, but no car-related safety net either.', teenTip: 'This looks cheapest until a single incident lands.' },
        { id: 'minimum', label: 'Minimum Liability', cost: 20, deductible: 900, payoutRate: 0.35, liability: true, collision: false, comprehensive: false, uninsured: false, quick: 'Covers damage you cause to other people, but leaves your own car exposed.', pitfall: 'Many drivers assume this protects their own car too. It does not.', whatItIs: 'A cheap starter plan built around basic liability only.', teenTip: 'Good for learning the difference between legal minimum and real protection.' },
        { id: 'standard', label: 'Standard Auto', cost: 45, deductible: 500, payoutRate: 0.65, liability: true, collision: true, comprehensive: false, uninsured: true, quick: 'A middle-ground plan that helps with crashes and uninsured drivers, but not theft or broken glass.', pitfall: 'Still weak against non-crash events like stolen cars or windshield damage.', whatItIs: 'A more balanced plan for common driving risks.', teenTip: 'This is often the smart middle choice for teen drivers.' },
        { id: 'strong', label: 'Full Auto Shield', cost: 70, deductible: 250, payoutRate: 0.9, liability: true, collision: true, comprehensive: true, uninsured: true, quick: 'Strongest protection for crashes, theft, weather, glass, and uninsured-driver problems.', pitfall: 'Best protection, but it takes more of your monthly budget.', whatItIs: 'A fuller auto plan with broad protection and lower out-of-pocket cost.', teenTip: 'Costs more each month, but can slash debt risk after a big event.' }
      ]
    },
    {
      id: 'health',
      category: 'health',
      icon: '❤️',
      name: 'Health Insurance',
      summary: 'This group changes how badly urgent care and medical surprise bills affect your savings.',
      tiers: [
        { id: 'none', label: 'No Health Plan', cost: 0, deductible: 999999, payoutRate: 0, urgentCare: false, quick: 'No monthly cost, but you pay the full bill when you need care.', pitfall: 'Young people often skip health coverage because they feel healthy. Bills still happen.', whatItIs: 'No medical protection at all.', teenTip: 'One random injury can cost more than months of premiums.' },
        { id: 'bare', label: 'Bare Bones Plan', cost: 10, deductible: 1000, payoutRate: 0.35, urgentCare: true, quick: 'Very cheap, but leaves a big deductible and weak payout.', pitfall: 'Having insurance is not the same as being well protected.', whatItIs: 'An entry-level medical plan with major gaps.', teenTip: 'Useful for showing why the cheapest plan is not always enough.' },
        { id: 'standard', label: 'Standard Plan', cost: 30, deductible: 500, payoutRate: 0.7, urgentCare: true, quick: 'Better balance between monthly cost and protection.', pitfall: 'Still may leave a meaningful bill after care.', whatItIs: 'A middle-tier health option for more realistic support.', teenTip: 'Often a smart learning choice because it shows trade-offs clearly.' },
        { id: 'strong', label: 'Strong Plan', cost: 50, deductible: 200, payoutRate: 0.9, urgentCare: true, quick: 'Highest cost, but much lower pain when something medical happens.', pitfall: 'The monthly price can crowd out other protection if your budget is tight.', whatItIs: 'A strong health plan with lower out-of-pocket shock.', teenTip: 'Great for athletes and anyone who wants smaller surprise bills.' }
      ]
    },
    {
      id: 'renters',
      category: 'renters',
      icon: '🏠',
      name: 'Renters Insurance',
      summary: 'This group protects your stuff in dorms or apartments, especially after theft, leaks, or fire damage.',
      tiers: [
        { id: 'none', label: 'No Renters Plan', cost: 0, deductible: 999999, payoutRate: 0, belongings: false, quick: 'No monthly cost, but your belongings are on your own.', pitfall: 'Your landlord\'s insurance is for the building, not your belongings.', whatItIs: 'No protection for personal belongings.', teenTip: 'This is the easiest coverage to underestimate.' },
        { id: 'basic', label: 'Basic Renters', cost: 8, deductible: 500, payoutRate: 0.55, belongings: true, quick: 'A low-cost start that helps, but leaves more uncovered loss.', pitfall: 'Cheap protection can still leave a painful gap after a theft or leak.', whatItIs: 'A basic belongings plan for small monthly cost.', teenTip: 'Good first step if you only have room for one low-cost protection.' },
        { id: 'standard', label: 'Standard Renters', cost: 14, deductible: 250, payoutRate: 0.8, belongings: true, quick: 'A strong value plan for electronics, clothing, and apartment stuff.', pitfall: 'It still does not insure the building itself.', whatItIs: 'A better-level renters plan with stronger payouts.', teenTip: 'Great fit for dorms and first apartments.' },
        { id: 'premium', label: 'High-Value Renters', cost: 22, deductible: 100, payoutRate: 0.92, belongings: true, quick: 'Best for people with more expensive stuff and low tolerance for loss.', pitfall: 'Great coverage, but maybe more than you need if your budget is tiny.', whatItIs: 'A stronger renters option for expensive belongings.', teenTip: 'Makes sense if you have a laptop, tablet, gaming gear, and other pricey stuff.' }
      ]
    },
    {
      id: 'dental',
      category: 'health',
      icon: '🦷',
      name: 'Dental Coverage',
      summary: 'This group handles dental bills that normal health plans often leave out.',
      tiers: [
        { id: 'none', label: 'No Dental Plan', cost: 0, deductible: 999999, payoutRate: 0, dental: false, quick: 'No monthly cost, but dental emergencies come straight from your pocket.', pitfall: 'Many people think health insurance will cover teeth. Often it does not.', whatItIs: 'No specific dental protection.', teenTip: 'You usually do not miss this until a painful bill arrives.' },
        { id: 'basic', label: 'Basic Dental', cost: 10, deductible: 400, payoutRate: 0.5, dental: true, quick: 'Affordable help for dental bills, but still leaves a bigger share for you.', pitfall: 'Helps, but major procedures can still hurt financially.', whatItIs: 'An entry dental plan with moderate help.', teenTip: 'Useful if you want some help without spending much.' },
        { id: 'strong', label: 'Strong Dental', cost: 20, deductible: 150, payoutRate: 0.82, dental: true, quick: 'Higher monthly cost, but much better for bigger procedures.', pitfall: 'May feel optional until you need a root canal fast.', whatItIs: 'A better dental plan for more serious treatments.', teenTip: 'Best for players who want less risk from surprise dental work.' }
      ]
    },
    {
      id: 'vision',
      category: 'health',
      icon: '👓',
      name: 'Vision Coverage',
      summary: 'This group helps with eye exams, broken glasses, and some vision-related costs that normal health plans may not handle well.',
      tiers: [
        { id: 'none', label: 'No Vision Plan', cost: 0, deductible: 999999, payoutRate: 0, vision: false, quick: 'No monthly cost, but glasses, frames, and eye-care bills are fully on you.', pitfall: 'A lot of people assume regular health insurance handles glasses and vision care. Often it does not.', whatItIs: 'No specific vision protection.', teenTip: 'This matters most if you already wear glasses or contacts.' },
        { id: 'basic', label: 'Basic Vision', cost: 8, deductible: 120, payoutRate: 0.55, vision: true, quick: 'A lower-cost plan that helps with routine vision costs and smaller gear replacements.', pitfall: 'Cheap vision coverage can still leave you paying a decent chunk for new glasses.', whatItIs: 'An entry vision plan for exams and basic help with eyewear.', teenTip: 'Useful if you want some help without spending much every month.' },
        { id: 'strong', label: 'Strong Vision', cost: 16, deductible: 40, payoutRate: 0.88, vision: true, quick: 'Better monthly cost, but much less pain if glasses break or you need eye-care support.', pitfall: 'Feels skippable until you suddenly need new glasses right away.', whatItIs: 'A stronger vision plan with better replacement support and lower out-of-pocket cost.', teenTip: 'Best for players who depend on glasses or contacts every day.' }
      ]
    },
    {
      id: 'savings',
      category: 'savings',
      icon: '💰',
      name: 'Emergency Fund',
      summary: 'This is not insurance, but it reduces how often deductibles and uncovered gaps turn into debt.',
      tiers: [
        { id: 'none', label: 'No Savings Boost', cost: 0, savingsBoost: 0, quick: 'You rely only on your starting savings.', pitfall: 'Even strong insurance often leaves some bill for you.', whatItIs: 'No added cash buffer.', teenTip: 'Insurance plus savings is often better than only one of them.' },
        { id: 'small', label: 'Small Cushion', cost: 10, savingsBoost: 200, quick: 'A modest buffer for deductibles and small emergencies.', pitfall: 'Helps, but not enough for a really bad event by itself.', whatItIs: 'A small savings boost for limited monthly cost.', teenTip: 'Good if you want some breathing room without spending much.' },
        { id: 'medium', label: 'Medium Cushion', cost: 20, savingsBoost: 400, quick: 'A stronger buffer that helps more events stay out of debt territory.', pitfall: 'Still does not replace missing coverage.', whatItIs: 'A medium savings upgrade.', teenTip: 'Pairs well with mid-level insurance choices.' },
        { id: 'large', label: 'Large Cushion', cost: 30, savingsBoost: 600, quick: 'The biggest cash buffer in the game.', pitfall: 'Cash alone cannot do what good insurance does on very large bills.', whatItIs: 'A larger savings reserve.', teenTip: 'Best when you want protection from deductibles and gaps after claims.' }
      ]
    }
  ]

  const MYTH_CARDS = [
    { id: 'm1', statement: "My landlord's insurance covers my stuff if there's a fire or theft.", answer: false, explanation: "Your landlord's insurance covers the building, not your belongings. Renters insurance protects your stuff.", tags: ['renters'] },
    { id: 'm2', statement: "Liability insurance will cover damage to my own car after a crash.", answer: false, explanation: "Liability covers damage you cause to other people and their property. It does not fix your own car.", tags: ['auto'] },
    { id: 'm3', statement: "If I'm young and healthy, I do not really need health insurance.", answer: false, explanation: "Accidents and surprise illnesses can still happen. Health insurance helps stop one bad day from becoming a huge financial hit.", tags: ['health'] },
    { id: 'm4', statement: "The cheapest insurance plan is always the smartest money choice.", answer: false, explanation: "Cheap plans can come with higher deductibles, lower payouts, or big coverage gaps. That can cost more later.", tags: ['auto', 'health', 'renters', 'dental'] },
    { id: 'm5', statement: "Insurance will pay for everything after an incident.", answer: false, explanation: "Insurance usually has deductibles, limits, and exclusions. You still need to know what is missing.", tags: ['auto', 'health', 'renters', 'dental'] },
    { id: 'm6', statement: "If another driver hits me, their insurance always covers my repairs.", answer: false, explanation: "Not if they have no insurance or not enough of it. That is why uninsured-driver protection matters.", tags: ['auto'] },
    { id: 'm7', statement: "If I pick a stronger tier, I will usually pay less out of pocket after a claim.", answer: true, explanation: "That is the core idea. Stronger tiers usually cost more each month but reduce deductibles, gaps, or uncovered losses later.", tags: ['auto', 'health', 'renters', 'dental', 'vision'] },
    { id: 'm8', statement: "Health insurance and dental insurance are basically the same thing.", answer: false, explanation: "Dental is often separate. A health plan can still leave you paying big dental bills on your own.", tags: ['health', 'dental'] },
    { id: 'm9', statement: "Renters insurance is only worth it if you own expensive furniture.", answer: false, explanation: "Even a laptop, clothes, school gear, and headphones can add up fast. Renters insurance is often worth it for everyday belongings.", tags: ['renters'] },
    { id: 'm10', statement: "Emergency savings can replace insurance completely.", answer: false, explanation: "Savings help with deductibles and smaller gaps, but a large loss can easily be much bigger than your cash buffer.", tags: ['savings'] },
    { id: 'm11', statement: "Roadside-type help and real auto protection are basically the same thing.", answer: false, explanation: "Breakdown help is not the same as coverage for crashes, theft, or uninsured drivers.", tags: ['auto'] },
    { id: 'm12', statement: "If I pick a stronger tier, I will usually pay less out of pocket after a claim.", answer: true, explanation: "That is the core idea. Stronger tiers usually cost more each month but reduce deductibles, gaps, or uncovered losses later.", tags: ['auto', 'health', 'renters', 'dental', 'vision'] },
    { id: 'm13', statement: "Glasses and vision care are always covered by a normal health plan, so a separate vision plan is pointless.", answer: false, explanation: "Vision benefits are often separate. Eye exams, frames, lenses, and replacement glasses may need their own coverage or still cost you a lot without it.", tags: ['vision', 'health'] }
  ]

  const EVENT_CARDS = [
    { id: 'rear-end', emoji: '💥', title: 'You Rear-Ended Someone', desc: 'You look down for a second and tap the car in front of you. Both cars need repairs.', totalCost: 1800, type: 'auto-collision', lesson: 'Liability helps the other driver, but stronger auto coverage matters if you also want help with your own car.', betterOption: 'A stronger auto tier lowers how much of this crash lands on you.' },
    { id: 'theft', emoji: '🔓', title: 'Your Laptop Was Stolen', desc: 'You leave your room unlocked for 20 minutes. Your laptop and headphones are gone.', totalCost: 1100, type: 'renters-loss', lesson: 'Renters insurance is about your belongings, not the building around them.', betterOption: 'Even a low-cost renters plan can protect expensive stuff.' },
    { id: 'urgent-care', emoji: '🏥', title: 'Urgent Care Visit', desc: 'You slip during intramurals and need X-rays and treatment. The bill arrives fast.', totalCost: 640, type: 'health-visit', lesson: 'Health tiers matter because weak plans may still leave you with a painful bill.', betterOption: 'A stronger health tier can turn a scary bill into a manageable one.' },
    { id: 'windshield', emoji: '🪟', title: 'Cracked Windshield', desc: 'A truck kicks up a rock on the freeway and your windshield cracks.', totalCost: 400, type: 'auto-comprehensive', lesson: 'Not every car problem is a crash. Glass, theft, and weather usually need stronger auto protection.', betterOption: 'Comprehensive-style help usually appears only in stronger auto tiers.' },
    { id: 'uninsured-driver', emoji: '🚨', title: 'Hit by an Uninsured Driver', desc: 'Another driver runs a red light and hits your car. They have no insurance.', totalCost: 3200, type: 'auto-uninsured', lesson: 'Someone else causing the crash does not guarantee someone else can pay for it.', betterOption: 'Auto plans with uninsured-driver help protect you from other people\'s mistakes.' },
    { id: 'pipe-leak', emoji: '💧', title: 'Apartment Pipe Leak', desc: 'A burst pipe damages your clothes, backpack, and laptop.', totalCost: 1400, type: 'renters-loss', lesson: 'Your belongings need their own protection. The building owner does not insure your stuff for you.', betterOption: 'A renters tier often has one of the strongest value-to-cost ratios in the game.' },
    { id: 'root-canal', emoji: '🦷', title: 'Emergency Root Canal', desc: 'Weeks of tooth pain lead to a same-week procedure and a big bill.', totalCost: 900, type: 'dental-procedure', lesson: 'Dental can be a separate risk from health insurance, which surprises a lot of first-time buyers.', betterOption: 'Dental tiers reduce how much a painful procedure also hurts your money.' },
    { id: 'broken-glasses', emoji: '👓', title: 'Broken Glasses', desc: 'Your glasses snap during practice and you need an exam plus a replacement pair this week.', totalCost: 380, type: 'vision-care', lesson: 'Vision-related costs are often separate from normal health coverage, especially for exams and replacement eyewear.', betterOption: 'A vision tier can turn an annoying surprise into a manageable cost.' },
    { id: 'car-theft', emoji: '🚗', title: 'Your Car Was Stolen', desc: 'You parked overnight in an unfamiliar area. Your car is gone.', totalCost: 6000, type: 'auto-comprehensive', lesson: 'Theft is not the same as a crash. Stronger auto tiers usually handle it better.', betterOption: 'A fuller auto tier can be the difference between a bad day and a total loss.' }
  ]

  const CATEGORIES = [
    { id: 'all', label: 'All Types', emoji: '🃏' },
    { id: 'auto', label: 'Auto', emoji: '🚗' },
    { id: 'health', label: 'Health', emoji: '❤️' },
    { id: 'renters', label: 'Renters', emoji: '🏠' },
    { id: 'savings', label: 'Savings', emoji: '💰' }
  ]

  const startGame = () => setCurrentScreen('screen-persona')

  const selectPersona = (id: string) => {
    const persona = PERSONAS.find(p => p.id === id)
    if (!persona) return

    setState(prev => ({
      ...prev,
      persona,
      initialSavings: persona.savings,
      debt: 0,
      round: 0,
      lessonsLearned: [],
      mythCorrect: 0,
      mythWrong: 0,
      usedMythIds: [],
      usedEventIds: [],
      activeCategory: 'all',
      selectedPlans: getDefaultPlans(),
      monthlySpent: 0,
      savings: persona.savings
    }))
    recalcPlanTotals()
    setCurrentScreen('screen-protection')
  }

  const getDefaultPlans = (): InsurancePlanMap => {
    const plans: InsurancePlanMap = {}
    INSURANCE_GROUPS.forEach(group => {
      plans[group.id] = 'none'
    })
    return plans
  }

  const recalcPlanTotals = () => {
    let monthlySpent = 0
    let savings = state.initialSavings
    INSURANCE_GROUPS.forEach(group => {
      const tier = getSelectedTier(group.id)
      monthlySpent += tier.cost || 0
      if (tier.savingsBoost) savings += tier.savingsBoost
    })
    setState(prev => ({ ...prev, monthlySpent, savings }))
  }

  const getSelectedTier = (groupId: string): InsuranceTier => {
    const group = INSURANCE_GROUPS.find(g => g.id === groupId)
    const selectedId = state.selectedPlans[groupId] || 'none'
    return (group?.tiers.find(t => t.id === selectedId) || INSURANCE_GROUPS[0].tiers[0]) as InsuranceTier
  }

  const selectTier = (groupId: string, tierId: string) => {
    const group = INSURANCE_GROUPS.find(g => g.id === groupId)
    if (!group || !state.persona) return

    const currentTier = getSelectedTier(groupId)
    const nextTier = group.tiers.find(t => t.id === tierId) as InsuranceTier | undefined
    if (!nextTier) return

    const budget = state.persona.budget
    const adjustedSpent = state.monthlySpent - currentTier.cost + nextTier.cost

    if (adjustedSpent > budget) {
      return
    }

    setState(prev => ({
      ...prev,
      selectedPlans: { ...prev.selectedPlans, [groupId]: tierId },
      monthlySpent: adjustedSpent,
      savings: prev.savings - (currentTier.savingsBoost ?? 0) + (nextTier.savingsBoost ?? 0)
    }))
  }

  const confirmProtection = () => {
    // Placeholder for now
    setCurrentScreen('screen-myth')
  }

  const coachMe = async () => {
    setState(prev => ({ ...prev, coachLoading: true }))
    const payload = {
      persona: state.persona,
      selectedPlans: state.selectedPlans,
      monthlySpent: state.monthlySpent,
      savings: state.savings,
      debt: state.debt,
      currentEvent: state.currentEvent,
      lastOutcome: state.lastOutcome
    }
    const prompt = `You are a coach for an insurance card game. Based on the following data, provide coach advice in JSON format with fields: summary, riskLevel (0-100), planGrade (A-F), gradeTone (good/mid/bad), insuranceShare (0-100), playerShare (0-100), mainGap, strongestPoint, moneyImpact, nextMoveLabel, nextMoveText, budgetShare (0-100), monthlyCost, extraMonthlyCost, estimatedDebtReduction, stateFarmLabel, stateFarmUrl, stateFarmNote.

Data: ${JSON.stringify(payload)}`

    try {
      const response = await callClaude(prompt)
      const cleaned = response.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```\s*$/, '')
      const data = JSON.parse(cleaned)
      const html = formatCoachAdvice(data, 'Generated by Claude.')
      setState(prev => ({ ...prev, coachAdviceHtml: html, coachLoading: false }))
    } catch (error) {
      console.error(error)
      setState(prev => ({ ...prev, coachLoading: false }))
    }
  }

  const formatCoachAdvice = (data: Record<string, any>, sourceLabel: string) => {
    const insuranceShare = Math.max(0, Math.min(100, Number(data.insuranceShare) || 0))
    const playerShare = Math.max(0, Math.min(100, 100 - insuranceShare))
    const coach: InsuranceCoachAdvice = {
      summary: data.summary || 'This plan changed the result more than expected.',
      riskLevel: Math.max(0, Math.min(100, Number(data.riskLevel) || 0)),
      planGrade: String(data.planGrade || 'C'),
      gradeTone: String(data.gradeTone || 'mid'),
      insuranceShare,
      playerShare,
      mainGap: String(data.mainGap || 'No clear gap identified.'),
      strongestPoint: String(data.strongestPoint || 'The plan had some useful protection.'),
      moneyImpact: String(data.moneyImpact || 'The money impact was manageable.'),
      nextMoveLabel: String(data.nextMoveLabel || 'Next Move'),
      nextMoveText: String(data.nextMoveText || 'Strengthen the weakest coverage area.'),
      budgetShare: Math.max(0, Math.min(100, Number(data.budgetShare) || 0)),
      monthlyCost: Number(data.monthlyCost) || 0,
      extraMonthlyCost: Number(data.extraMonthlyCost) || 0,
      estimatedDebtReduction: Number(data.estimatedDebtReduction) || 0,
      stateFarmLabel: String(data.stateFarmLabel || ''),
      stateFarmUrl: String(data.stateFarmUrl || ''),
      stateFarmNote: String(data.stateFarmNote || '')
    }
    return `
      <div class="coach-box">
        <div class="coach-head">
          <div class="coach-title">COACH ME</div>
          <div class="coach-actions" style="margin-top:0">
            <button class="btn-ghost" onclick="playCoachAudio()" ${state.coachAudioLoading ? 'disabled' : ''}>${state.coachAudioLoading ? 'Loading Voice...' : 'Listen'}</button>
            <button class="btn-ghost" onclick="coachMe()" ${state.coachLoading ? 'disabled' : ''}>Refresh</button>
          </div>
        </div>
        <div class="coach-summary">${coach.summary}</div>
        <div class="coach-copy">A visual breakdown of how this plan handled the event, where the weak spot was, and what change would help next.</div>
        <div class="coach-grid">
          <div class="coach-hero">
            <div class="coach-grade ${coach.gradeTone}">${coach.planGrade}</div>
            <div class="coach-risk">
              <div class="coach-risk-top"><span>Risk Level</span><span>${coach.riskLevel}/100</span></div>
              <div class="coach-risk-track"><div class="coach-risk-fill" style="width:${coach.riskLevel}%"></div></div>
            </div>
          </div>
          <div class="coach-body">
            <div class="coach-strip">
              <div class="coach-chip">
                <div class="coach-chip-label">Monthly Cost</div>
                <div class="coach-chip-value">$${coach.monthlyCost}</div>
                <div class="coach-chip-copy">${coach.budgetShare}% of this persona's monthly budget.</div>
              </div>
              <div class="coach-chip">
                <div class="coach-chip-label">Upgrade Cost</div>
                <div class="coach-chip-value">${coach.extraMonthlyCost > 0 ? `+$${coach.extraMonthlyCost}` : '$0'}</div>
                <div class="coach-chip-copy">Extra monthly spend for the clearest next improvement.</div>
              </div>
              <div class="coach-chip">
                <div class="coach-chip-label">Debt Saved</div>
                <div class="coach-chip-value">$${coach.estimatedDebtReduction}</div>
                <div class="coach-chip-copy">Estimated debt reduction from that next move.</div>
              </div>
            </div>
            <div class="coach-split">
              <div class="coach-chip-label">Bill Split</div>
              <div class="coach-copy">How much of the event landed on insurance versus the player.</div>
              <div class="coach-split-bar">
                <div class="coach-split-insurance" style="width:${coach.insuranceShare}%"></div>
                <div class="coach-split-player" style="width:${coach.playerShare}%"></div>
              </div>
              <div class="coach-split-legend">
                <div class="coach-legend-pill">Insurance ${coach.insuranceShare}%</div>
                <div class="coach-legend-pill">Player ${coach.playerShare}%</div>
              </div>
            </div>
            <div class="coach-insights">
              <div class="coach-point">
                <div class="coach-point-label">Main Gap</div>
                <div class="coach-copy">${coach.mainGap}</div>
              </div>
              <div class="coach-point">
                <div class="coach-point-label">Strongest Point</div>
                <div class="coach-copy">${coach.strongestPoint}</div>
              </div>
              <div class="coach-point">
                <div class="coach-point-label">Money Impact</div>
                <div class="coach-copy">${coach.moneyImpact}</div>
              </div>
              <div class="coach-point">
                <div class="coach-point-label">${coach.nextMoveLabel}</div>
                <div class="coach-copy">${coach.nextMoveText}</div>
              </div>
            </div>
            ${coach.stateFarmUrl ? `
              <div class="coach-statefarm">
                <div class="coach-statefarm-top">
                  <div class="coach-statefarm-badge">State Farm Match</div>
                  <a class="coach-link" href="${coach.stateFarmUrl}" target="_blank" rel="noreferrer">Open ${coach.stateFarmLabel}</a>
                </div>
                <div class="coach-copy">${coach.stateFarmNote}</div>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="coach-source">${sourceLabel}</div>
      </div>
    `
  }

  // Render based on currentScreen
  if (currentScreen === 'screen-title') {
    return (
      <div className="clay-card p-5 flex flex-col gap-4" style={{ background: 'linear-gradient(160deg, #f5ede0 0%, #e8ddd0 50%, #ddd0c0 100%)' }}>
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-4">The Insurance Card Game</div>
          <div className="text-4xl font-black mb-2">SAFETY<br/><span className="text-orange-500">NET</span></div>
          <div className="text-sm text-gray-600 mb-8">Build your protection. Face real life. Learn how cheap plans, stronger plans, and coverage gaps change what happens.</div>
          <div className="flex gap-2 justify-center mb-6">
            <div className="w-12 h-16 bg-blue-200 rounded-lg flex items-center justify-center text-2xl">🧑</div>
            <div className="w-12 h-16 bg-orange-200 rounded-lg flex items-center justify-center text-2xl">🛡️</div>
            <div className="w-12 h-16 bg-green-200 rounded-lg flex items-center justify-center text-2xl">⚡</div>
            <div className="w-12 h-16 bg-yellow-200 rounded-lg flex items-center justify-center text-2xl">📊</div>
          </div>
          <div className="flex flex-col gap-2 max-w-xs mx-auto">
            <button className="bg-orange-500 text-white font-bold py-3 px-8 rounded-full uppercase text-sm" onClick={startGame}>DEAL THE CARDS</button>
            <button className="bg-white text-gray-600 font-semibold py-2 px-6 rounded-full text-sm">Coverage Guide</button>
            <button className="bg-white text-gray-600 font-semibold py-2 px-6 rounded-full text-sm">How to play</button>
          </div>
        </div>
      </div>
    )
  }

  if (currentScreen === 'screen-persona') {
    return (
      <div className="clay-card p-5">
        <div className="text-center mb-6">
          <div className="text-xs font-bold text-orange-600 uppercase">Step 1 of 4</div>
          <div className="text-2xl font-black">CHOOSE YOUR PERSONA</div>
          <div className="text-sm text-gray-600">Your life situation shapes your risks, budget, and what protection matters most.</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PERSONAS.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl shadow cursor-pointer hover:shadow-lg transition" onClick={() => selectPersona(p.id)}>
              <div className="text-3xl mb-2">{p.emoji}</div>
              <div className="font-black text-lg">{p.name}</div>
              <div className="text-sm text-gray-600 mb-3">{p.desc}</div>
              <div className="text-xs">
                <div>Monthly Budget: ${p.budget}/mo</div>
                <div>Starting Savings: ${p.savings}</div>
                <div>Higher risk: {p.riskBoost.join(', ')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (currentScreen === 'screen-protection') {
    const budget = state.persona?.budget || 0
    const spent = state.monthlySpent
    const remaining = budget - spent
    const filteredGroups = state.activeCategory === 'all'
      ? INSURANCE_GROUPS
      : INSURANCE_GROUPS.filter(g => g.category === state.activeCategory)

    return (
      <div className="clay-card p-5">
        <div className="text-center mb-6">
          <div className="text-xs font-bold text-orange-600 uppercase">Step 2 of 4</div>
          <div className="text-2xl font-black">BUILD YOUR SAFETY NET</div>
          <div className="text-sm text-gray-600">Pick one tier for each insurance type. Bigger protection usually costs more, but changes what happens later.</div>
        </div>
        <div className="bg-white rounded-2xl p-4 mb-4 shadow">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Monthly Budget</span>
            <span className="font-bold text-green-600">${budget}/mo</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Spent</span>
            <span className="font-bold text-red-600">${spent}/mo</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium">Remaining</span>
            <span className={`font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>${remaining}/mo</span>
          </div>
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat.id} className={`px-4 py-2 rounded-full text-sm font-bold ${state.activeCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-white text-gray-600'}`} onClick={() => setState(prev => ({ ...prev, activeCategory: cat.id }))}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
        <div className="space-y-4 mb-6">
          {filteredGroups.map(group => {
            const currentTier = getSelectedTier(group.id)
            return (
              <div key={group.id} className="bg-white rounded-2xl p-4 shadow">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-black text-lg">{group.icon} {group.name}</div>
                  <button className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">i</button>
                </div>
                <div className="text-sm text-gray-600 mb-3">{group.summary}</div>
                <div className="text-xs text-orange-600 font-bold mb-3">Current: {currentTier.label}</div>
                <div className="space-y-2">
                  {group.tiers.map(tier => {
                    const selected = state.selectedPlans[group.id] === tier.id
                    const adjustedSpent = state.monthlySpent - currentTier.cost + tier.cost
                    const unaffordable = !selected && adjustedSpent > budget
                    return (
                      <div key={tier.id} className={`p-3 rounded-xl border-2 cursor-pointer transition ${selected ? 'border-green-500 bg-green-50' : unaffordable ? 'border-red-300 bg-red-50 opacity-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`} onClick={() => selectTier(group.id, tier.id)}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="font-bold">{tier.label}</div>
                          <div className="font-bold text-orange-600">${tier.cost}/mo</div>
                        </div>
                        <div className="text-sm text-gray-600">{tier.quick}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <button className="w-full bg-orange-500 text-white font-bold py-3 rounded-full uppercase text-sm" onClick={confirmProtection}>LOCK IN MY PLAN →</button>
      </div>
    )
  }

  if (currentScreen === 'screen-myth') {
    return (
      <div className="clay-card p-5">
        <div className="text-center mb-6">
          <div className="text-xs font-bold text-orange-600 uppercase">Myth Quiz</div>
          <div className="text-2xl font-black">Test Your Knowledge</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow text-center">
          <div className="text-lg font-bold mb-4">"Insurance myths can lead to bad decisions."</div>
          <div className="flex gap-4 justify-center">
            <button className="bg-green-500 text-white font-bold py-2 px-6 rounded-full" onClick={() => setCurrentScreen('screen-event')}>TRUE</button>
            <button className="bg-red-500 text-white font-bold py-2 px-6 rounded-full" onClick={() => setCurrentScreen('screen-event')}>FALSE</button>
          </div>
        </div>
      </div>
    )
  }

  if (currentScreen === 'screen-event') {
    return (
      <div className="clay-card p-5">
        <div className="text-center mb-6">
          <div className="text-xs font-bold text-orange-600 uppercase">Life Event</div>
          <div className="text-2xl font-black">Something Happened</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow text-center">
          <div className="text-4xl mb-4">💥</div>
          <div className="text-xl font-bold mb-2">Car Accident</div>
          <div className="text-sm text-gray-600 mb-4">You rear-ended someone. Total cost: $1800</div>
          <button className="bg-orange-500 text-white font-bold py-3 px-8 rounded-full uppercase text-sm" onClick={() => setCurrentScreen('screen-result')}>SEE WHAT HAPPENS →</button>
        </div>
      </div>
    )
  }

  if (currentScreen === 'screen-result') {
    return (
      <div className="clay-card p-5">
        <div className="text-center mb-6">
          <div className="text-xs font-bold text-orange-600 uppercase">Result</div>
          <div className="text-2xl font-black">How Did Your Plan Do?</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">⚠️</div>
            <div className="text-xl font-bold">Mostly Covered</div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Total Cost</span>
              <span className="font-bold text-red-600">$1800</span>
            </div>
            <div className="flex justify-between">
              <span>Insurance Paid</span>
              <span className="font-bold text-green-600">$900</span>
            </div>
            <div className="flex justify-between">
              <span>You Paid</span>
              <span className="font-bold text-red-600">$900</span>
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-4">Liability helps the other driver, but stronger auto coverage matters if you also want help with your own car.</div>
          <div className="bg-orange-50 p-4 rounded-xl mb-4">
            <div className="text-sm font-bold text-orange-600 mb-2">LESSON</div>
            <div className="text-sm">A stronger auto tier lowers how much of this crash lands on you.</div>
          </div>
          <button className="w-full bg-blue-500 text-white font-bold py-2 rounded-full text-sm mb-2" onClick={coachMe} disabled={state.coachLoading}>
            {state.coachLoading ? 'Loading...' : 'Coach Me'}
          </button>
          <button className="w-full bg-orange-500 text-white font-bold py-3 rounded-full uppercase text-sm" onClick={() => setCurrentScreen('screen-end')}>NEXT ROUND →</button>
        </div>
        {state.coachAdviceHtml && <div dangerouslySetInnerHTML={{ __html: state.coachAdviceHtml }} />}
      </div>
    )
  }

  if (currentScreen === 'screen-end') {
    return (
      <div className="clay-card p-5">
        <div className="text-center">
          <div className="text-4xl font-black mb-2">A</div>
          <div className="text-sm text-gray-600 mb-4">Financial Pro</div>
          <div className="text-lg font-bold mb-4">You survived 3 rounds!</div>
          <button className="bg-orange-500 text-white font-bold py-3 px-8 rounded-full uppercase text-sm" onClick={() => setCurrentScreen('screen-title')}>PLAY AGAIN</button>
        </div>
      </div>
    )
  }

  return (
    <div className="clay-card p-5">
      <p>Screen not implemented yet: {currentScreen}</p>
    </div>
  )
}

export default InsuranceCardGame