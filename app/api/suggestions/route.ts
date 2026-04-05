// app/api/suggestions/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { anthropicProvider } from '@/lib/ai/anthropic'
import { isProfileStale } from '@/lib/utils/profile-hash'
import type {
  DbUser,
  DbProfile,
  DbLearningProgress,
  DbBudgetEntry,
  DbActionPlan,
  DbSuggestion,
} from '@/types/database'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data: dbUser } = (await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()) as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return NextResponse.json([])

  const now = new Date().toISOString()
  const { data } = await (supabase
    .from('suggestions')
    .select('*')
    .eq('user_id', dbUser.id)
    .eq('dismissed', false)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false }) as unknown as Promise<{
    data: DbSuggestion[] | null
  }>)

  return NextResponse.json(data || [])
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = (await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()) as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  const [profileRes, learningRes, budgetRes, plansRes] = (await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', dbUser.id).single(),
    supabase.from('learning_progress').select('*').eq('user_id', dbUser.id),
    supabase
      .from('budget_entries')
      .select('*')
      .eq('user_id', dbUser.id)
      .order('date', { ascending: false })
      .limit(30),
    supabase
      .from('action_plans')
      .select('*')
      .eq('user_id', dbUser.id)
      .order('updated_at', { ascending: false })
      .limit(5),
  ])) as [
    { data: DbProfile | null },
    { data: DbLearningProgress[] | null },
    { data: DbBudgetEntry[] | null },
    { data: DbActionPlan[] | null },
  ]

  const profile = profileRes.data
  if (!profile) return NextResponse.json(null, { status: 404 })

  const learning = learningRes.data ?? []
  const recentBudget = budgetRes.data ?? []
  const activePlans = plansRes.data ?? []

  const totalExpenses = Object.values(profile.expenses as Record<string, number>).reduce(
    (a, b) => a + b,
    0
  )
  const surplus = profile.income_monthly - totalExpenses
  const totalDebt = (profile.debts as Array<{ amount: number }>).reduce((a, d) => a + d.amount, 0)
  const stalePlansCount = activePlans.filter((p) =>
    isProfileStale(p.profile_snapshot_hash, profile)
  ).length
  const unmasteredConcepts = learning
    .filter((l) => l.confidence_level !== 'high')
    .map((l) => l.concept)

  const prompt = `You are Cents's proactive suggestion engine. Generate 2–3 personalized financial suggestions.

User:
- Persona: ${profile.persona.replace(/_/g, ' ')}
- Income: $${profile.income_monthly}/mo (${profile.income_type}), expenses: $${totalExpenses}/mo, surplus: $${surplus}
- Debt: $${totalDebt}
- Health score: ${profile.financial_health_score}/100
- Goals: ${JSON.stringify(profile.goals)}
- Recent transactions: ${
    recentBudget
      .slice(0, 5)
      .map((e) => `${e.entry_type} ${e.category} $${e.amount}`)
      .join(', ') || 'none'
  }
- Stale action plans: ${stalePlansCount}
- Concepts not yet mastered: ${unmasteredConcepts.join(', ') || 'all mastered'}

Return ONLY a JSON array, no markdown fences, no extra text:
[{"type":"insight"|"simulation"|"learning"|"plan","title":"...","reason":"...","severity":"low"|"medium"|"high","chat_seed":"..."}]`

  type SuggestionInput = {
    type: string
    title: string
    reason: string
    severity: string
    chat_seed: string
  }
  let suggestions: SuggestionInput[] = []
  try {
    const { text } = await generateText({
      model: anthropicProvider('claude-haiku-4-5-20251001'),
      prompt,
    })
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```\s*$/, '')
    suggestions = JSON.parse(cleaned)
    if (!Array.isArray(suggestions)) throw new Error('Not an array')
  } catch {
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }

  // Clear old undismissed suggestions before writing new ones
  await (supabase.from('suggestions') as any)
    .delete()
    .eq('user_id', dbUser.id)
    .eq('dismissed', false)

  const VALID_TYPES = ['insight', 'simulation', 'learning', 'plan']
  const VALID_SEVERITIES = ['low', 'medium', 'high']

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const rows = suggestions
    .filter((s) => VALID_TYPES.includes(s.type) && VALID_SEVERITIES.includes(s.severity))
    .map((s) => ({
      user_id: dbUser.id,
      type: s.type,
      title: String(s.title).slice(0, 200),
      reason: String(s.reason).slice(0, 500),
      severity: s.severity,
      chat_seed: s.chat_seed ? String(s.chat_seed).slice(0, 500) : null,
      expires_at: expiresAt,
      dismissed: false,
    }))

  const { data: inserted, error } = await ((supabase.from('suggestions') as any)
    .insert(rows)
    .select() as unknown as Promise<{
    data: DbSuggestion[] | null
    error: { message: string } | null
  }>)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(inserted)
}

export async function PATCH(req: Request) {
  let id: string
  try {
    const body = await req.json()
    if (!body?.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }
    id = body.id
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = (await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single()) as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  // Filter by user_id to prevent dismissing another user's suggestions
  await (supabase.from('suggestions') as any)
    .update({ dismissed: true })
    .eq('id', id)
    .eq('user_id', dbUser.id)
  return NextResponse.json({ ok: true })
}
