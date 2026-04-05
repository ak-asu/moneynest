// app/api/chat/route.ts
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  validateUIMessages,
  type ModelMessage,
  type UIMessage,
} from 'ai'
import { createClient } from '@/lib/supabase/server'
import { anthropicProvider } from '@/lib/ai/anthropic'
import { buildSystemPrompt } from '@/lib/ai/context'
import { agentTools } from '@/lib/ai/tools'
import type { AgentContext } from '@/lib/ai/context'
import type { OnFinishEvent } from 'ai'
import type { AgentTools } from '@/lib/ai/tools'
import type {
  DbActionPlan,
  DbBudgetEntry,
  DbLearningProgress,
  DbMessage,
  DbProfile,
  DbUser,
} from '@/types/database'

export const maxDuration = 60

export async function POST(request: Request) {
  let messages: ModelMessage[], uiMessages: UIMessage[], sessionId: string | null | undefined
  try {
    const body = await request.json()
    if (!Array.isArray(body.messages)) {
      return new Response('messages must be an array', { status: 400 })
    }
    uiMessages = await validateUIMessages({ messages: body.messages })
    // Strip tool parts from history before converting to model messages.
    // Historical messages loaded from the DB have tool result parts with random IDs
    // (no matching tool_use block), which Anthropic rejects. Text content is enough
    // for the LLM to understand the conversation context.
    const strippedMessages = uiMessages.map(msg => ({
      ...msg,
      parts: msg.parts.filter((p: { type: string }) => p.type === 'text' || p.type === 'file'),
    }))
    messages = await convertToModelMessages(
      strippedMessages.map(({ id, ...message }) => {
        void id
        return message
      }),
      { tools: agentTools, ignoreIncompleteToolCalls: true },
    )
    sessionId = body.sessionId
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Get user internal id — cast needed: supabase-js@2 inference resolves some
  // table Row types as `never` when using select('id'); see known TS issue.
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single() as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return new Response('User not found', { status: 404 })

  // Build agent context
  const [profileRes, learningRes, budgetRes, plansRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', dbUser.id).single(),
    supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', dbUser.id) as unknown as Promise<{ data: DbLearningProgress[] | null }>,
    supabase
      .from('budget_entries')
      .select('*')
      .eq('user_id', dbUser.id)
      .gte(
        'date',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      )
      .order('date', { ascending: false }),
    supabase
      .from('action_plans')
      .select('*')
      .eq('user_id', dbUser.id)
      .eq('completed_steps', 0),
  ]) as [
    { data: DbProfile | null },
    { data: DbLearningProgress[] | null },
    { data: DbBudgetEntry[] | null },
    { data: DbActionPlan[] | null },
  ]

  if (!profileRes.data) return new Response('Profile not found', { status: 404 })

  const context: AgentContext = {
    profile: profileRes.data,
    learning: learningRes.data || [],
    recentBudget: budgetRes.data || [],
    activePlans: plansRes.data || [],
  }

  const systemPrompt = buildSystemPrompt(context)

  // Persist user message before streaming
  if (sessionId) {
    const lastUserMsg = uiMessages[uiMessages.length - 1]
    if (lastUserMsg?.role === 'user') {
      const userText = lastUserMsg.parts
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map(part => part.text)
        .join('\n')

      const msgRow: Omit<DbMessage, 'id' | 'created_at'> = {
        session_id: sessionId,
        role: 'user',
        text: userText || null,
        components: [],
      }
      // @ts-expect-error supabase-js@2 resolves Insert type as `never` for this table
      await supabase.from('messages').insert(msgRow)
    }
  }

  const result = streamText({
    model: anthropicProvider('claude-sonnet-4-6'),
    system: systemPrompt,
    messages: messages.slice(-10),
    maxTokens: 4096,
    tools: agentTools,
    stopWhen: stepCountIs(5),
    onFinish: async (event: OnFinishEvent<AgentTools>) => {
      try {
        if (!sessionId) return

        // Aggregate tool results across all steps (supports maxSteps > 1)
        const allToolResults = event.steps.flatMap(step => step.toolResults)

        const components = allToolResults.map(tr => ({
          name: tr.toolName,
          props: tr.output as Record<string, unknown>,
        }))

        // Aggregate text across all steps
        const textContent = event.steps
          .map(step => step.text)
          .filter(Boolean)
          .join('')

        const assistantRow: Omit<DbMessage, 'id' | 'created_at'> = {
          session_id: sessionId,
          role: 'assistant',
          text: textContent || null,
          components,
        }
        // @ts-expect-error supabase-js@2 resolves Insert type as `never` for this table
        await supabase.from('messages').insert(assistantRow)

        // Update learning_progress for any LearningCard rendered
        const learningCards = components.filter(c => c.name === 'learning_card')
        const learningCountCache = new Map<string, number>(
          (learningRes.data || []).map(l => [l.concept, l.exposure_count])
        )
        for (const card of learningCards) {
          const props = card.props as { concept: string }
          const existingExposure = learningCountCache.get(props.concept) ?? 0
          const newExposureCount = existingExposure + 1
          learningCountCache.set(props.concept, newExposureCount)
          const progressRow: Omit<DbLearningProgress, 'id'> = {
            user_id: dbUser.id,
            concept: props.concept,
            exposure_count: newExposureCount,
            confidence_level: computeConfidenceLevel(newExposureCount),
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          await supabase
            .from('learning_progress')
            // @ts-expect-error supabase-js@2 resolves Insert type as `never` for this table
            .upsert(progressRow, { onConflict: 'user_id,concept' })
        }
      } catch (err) {
        console.error('[chat/route] onFinish persistence error:', err)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}

function computeConfidenceLevel(
  exposureCount: number,
): 'low' | 'medium' | 'high' {
  if (exposureCount >= 4) return 'high'
  if (exposureCount >= 2) return 'medium'
  return 'low'
}
