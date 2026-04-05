// lib/ai/context.ts
import type { DbProfile, DbLearningProgress, DbBudgetEntry, DbActionPlan, DbDocument } from '@/types/database'

export interface AgentContext {
  profile: DbProfile
  learning: DbLearningProgress[]
  recentBudget: DbBudgetEntry[]
  activePlans: DbActionPlan[]
  documents: DbDocument[]
  relevantMemories: string[]
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

export function buildSystemPrompt(ctx: AgentContext): string {
  const { profile, learning, recentBudget, activePlans, documents, relevantMemories } = ctx

  const masteredConcepts = learning
    .filter(l => l.confidence_level === 'high')
    .map(l => l.concept)

  const totalIncome = profile.income_monthly
  const totalExpenses = Object.values(profile.expenses).reduce((a, b) => a + b, 0)
  const monthlySurplus = totalIncome - totalExpenses

  const budgetSummary = Object.entries(profile.expenses)
    .map(([cat, amt]) => `${cat}: $${amt}/mo`)
    .join(', ')

  const recentBudgetSummary = recentBudget
    .slice(0, 5)
    .map(e => `${e.entry_type} ${e.category}: $${e.amount} on ${e.date}`)
    .join('; ')

  const debtSummary = profile.debts
    .map(d => `${d.type} $${d.amount} at ${d.rate}%`)
    .join(', ') || 'none'

  const goalSummary = profile.goals
    .map(g => `${g.label} ($${g.target_amount} by ${g.target_date})`)
    .join(', ') || 'none stated'

  const existingPlanSteps = activePlans
    .flatMap(p => (p.steps as Array<{ label: string }>).map(s => s.label))
    .join(', ')

  // Build document context — summarize each doc with key risk info
  const documentContext = documents.length > 0
    ? documents.map(d => {
        const ex = d.ai_explanation
        const riskFlags = ex?.risk_flags?.length ? ` ⚠ ${ex.risk_flags.slice(0, 2).join('; ')}` : ''
        const summary = ex?.plain_summaries?.[0] ? ` — ${ex.plain_summaries[0].slice(0, 150)}` : ''
        const highRisk = ex?.clauses?.filter(c => c.risk === 'high').length ?? 0
        const riskNote = highRisk > 0 ? ` [${highRisk} HIGH-RISK clause${highRisk > 1 ? 's' : ''}]` : ''
        return `- [${d.document_type.toUpperCase()}] "${d.filename}" (uploaded ${formatDate(d.created_at)})${riskNote}${summary}${riskFlags}`
      }).join('\n')
    : 'None uploaded yet'

  const memoriesContext = relevantMemories.length > 0
    ? relevantMemories.map(m => `- ${m}`).join('\n')
    : ''

  return `You are Vela, a compassionate and knowledgeable financial wellness advisor built for underserved communities.

## User Profile
- Persona: ${profile.persona.replace(/_/g, ' ')}
- Language preference: ${profile.language}
- Monthly income: $${totalIncome} (${profile.income_type})
- Monthly expenses: $${totalExpenses} (${budgetSummary})
- Monthly surplus: $${monthlySurplus}
- Savings balance: $${profile.savings_balance.toLocaleString()}
- Recent budget activity: ${recentBudgetSummary || 'none recorded'}
- Debts: ${debtSummary}
- Goals: ${goalSummary}
- Financial health score: ${profile.financial_health_score}/100

## Uploaded Documents
${documentContext}

## What this user already understands well (DO NOT re-explain these):
${masteredConcepts.length > 0 ? masteredConcepts.join(', ') : 'Nothing mastered yet — explain concepts clearly'}

## Active action plan steps already in progress (DO NOT duplicate):
${existingPlanSteps || 'None'}
${memoriesContext ? `\n## Relevant context from memory:\n${memoriesContext}` : ''}

## Instructions
- Always respond in ${profile.language === 'es' ? 'Spanish' : 'English'}
- Use plain language — no jargon without explanation
- Reference the user's actual numbers in every response (not hypothetical examples)
- Use tools to render interactive components — prefer components over long text
- Sequence tools intentionally: acknowledge → simulate/explain → insight → action
- Only render a LearningCard for a concept if it is NOT in the mastered list above
- Never suggest steps already covered in active plans
- When the user asks about a document they've uploaded, use the document_explainer tool with the exact data from their uploaded documents listed above
- When you want to direct the user to their Document Vault (e.g., "check your insurance policy"), use the view_document tool
- Be warm, non-judgmental, and encouraging — financial stress is real`
}
