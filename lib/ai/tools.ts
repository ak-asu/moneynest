// lib/ai/tools.ts
import { tool } from 'ai'
import { z } from 'zod'

// Each tool uses a passthrough execute so streamText resolves tool calls server-side.
// The result (same as input params) is streamed as a tool-result part, which the client
// renders via the component registry and the onFinish handler persists to Supabase.
export const agentTools = {
  voice_card: tool({
    description:
      'Speak a message to the user using ElevenLabs TTS. Use this first to acknowledge emotionally significant moments.',
    inputSchema: z.object({
      script: z.string().describe('What to say out loud'),
      voice_id: z.string().describe('ElevenLabs voice ID from the user profile'),
      emotion: z.enum(['neutral', 'warm', 'urgent', 'celebratory']).default('neutral'),
      show_transcript: z.boolean().default(true),
      language: z.string().default('en'),
    }),
    execute: async (params) => params,
  }),

  document_explainer: tool({
    description:
      'Render an interactive explanation of a financial document with clauses, risk flags, and what-if buttons. When the user has uploaded documents, populate this from the exact data in their document list.',
    inputSchema: z.object({
      document_id: z.string(),
      document_type: z.enum(['insurance', 'lease', 'bill', 'payslip', 'other']),
      title: z.string(),
      summary: z.string().describe('2-3 sentence plain-language summary'),
      clauses: z.array(
        z.object({
          label: z.string(),
          plain: z.string(),
          risk: z.enum(['low', 'medium', 'high']),
          detail: z.string().optional(),
        }),
      ),
      what_ifs: z.array(
        z.object({
          label: z.string(),
          simulation_id: z.string(),
        }),
      ),
      voice_enabled: z.boolean().default(true),
      language: z.string().default('en'),
    }),
    execute: async (params) => params,
  }),

  view_document: tool({
    description:
      'Direct the user to view a specific document (or their Document Vault in general) when referencing an uploaded document is more useful than re-explaining it inline. Use when you want to say "go check your [document type] in the vault".',
    inputSchema: z.object({
      document_id: z.string().optional().describe('ID of the specific document, if known'),
      filename: z.string().optional().describe('Filename of the document for display'),
      document_type: z.enum(['insurance', 'lease', 'bill', 'payslip', 'other', 'general']).default('general'),
      message: z.string().describe('Brief message explaining why to view this document and what to look for'),
    }),
    execute: async (params) => params,
  }),

  crisis_simulator: tool({
    description:
      "Launch an interactive financial crisis simulation using the user's real numbers.",
    inputSchema: z.object({
      scenario: z.string().describe('Machine-readable scenario id e.g. job_loss_2_weeks'),
      scenario_label: z.string().describe('Human readable label e.g. "2 weeks without income"'),
      duration_days: z.number(),
      income_monthly: z.number(),
      fixed_expenses: z.record(z.number()),
      savings: z.number(),
      decision_points: z.array(
        z.object({
          day: z.number(),
          prompt: z.string(),
          options: z.array(
            z.object({
              label: z.string(),
              impact: z.number().describe('Dollar impact (negative = loss)'),
              consequence: z.string(),
            }),
          ),
        }),
      ),
    }),
    execute: async (params) => params,
  }),

  mini_game: tool({
    description:
      "Generate an interactive financial mini-game using the user's actual income and expense numbers.",
    inputSchema: z.object({
      game_type: z.enum(['drag_drop', 'time_pressure', 'allocation_puzzle', 'tradeoff_slider', 'insurance_card_game', 'term_match', 'fin_word', 'wealth_farm', 'credit_quest_game']),
      title: z.string(),
      instructions: z.string().optional(),
      income: z.number().optional(),
      categories: z.array(
        z.object({
          name: z.string(),
          suggested: z.number(),
          min: z.number(),
          max: z.number(),
        }),
      ).optional(),
      win_condition: z.string().optional(),
      time_limit_seconds: z.number().optional(),
    }),
    execute: async (params) => params,
  }),

  insight_card: tool({
    description:
      "Surface a financial insight or gap detected in the user's profile. Use after simulations.",
    inputSchema: z.object({
      title: z.string(),
      body: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      actions: z
        .array(
          z.object({
            label: z.string(),
            detail: z.string(),
          }),
        )
        .max(3),
      voice_enabled: z.boolean().default(true),
      language: z.string().default('en'),
    }),
    execute: async (params) => params,
  }),

  budget_snapshot: tool({
    description: "Show a visual breakdown of the user's income vs expenses with anomalies.",
    inputSchema: z.object({
      income_monthly: z.number(),
      expenses: z.record(z.number()),
      savings_rate: z.number().min(0).max(1).describe('0-1 fraction'),
      anomalies: z.array(z.string()),
      coverage_gaps: z.array(z.string()),
    }),
    execute: async (params) => params,
  }),

  scenario_timeline: tool({
    description: 'Show a timeline of projected financial events and decision points.',
    inputSchema: z.object({
      title: z.string(),
      events: z.array(
        z.object({
          date: z.string(),
          label: z.string(),
          amount: z.number(),
          type: z.enum(['income', 'expense', 'decision', 'outcome']),
        }),
      ),
    }),
    execute: async (params) => params,
  }),

  learning_card: tool({
    description:
      'Explain a financial concept the user does not yet understand. Include a visual image prompt for Gemini.',
    inputSchema: z.object({
      concept: z.string().describe('Machine-readable concept key e.g. emergency_fund'),
      title: z.string(),
      explanation: z.string(),
      key_takeaway: z.string().describe('One sentence the user should remember'),
      image_prompt: z.string().describe('Gemini image prompt for a simple visual metaphor'),
      image_url: z.string().url().optional().describe('Populated server-side after Gemini image generation'),
      voice_enabled: z.boolean().default(true),
      language: z.string().default('en'),
    }),
    execute: async (params) => params,
  }),

  action_plan: tool({
    description:
      "Generate a concrete, step-by-step action plan based on the user's real numbers and situation.",
    inputSchema: z.object({
      title: z.string(),
      steps: z.array(
        z.object({
          label: z.string(),
          amount: z.number().optional(),
          deadline: z.string().optional(),
          detail: z.string(),
        }),
      ),
      language: z.string().default('en'),
    }),
    execute: async (params) => params,
  }),

  profile_snapshot: tool({
    description: "Show the user's financial identity card with health score and detected gaps.",
    inputSchema: z.object({
      persona: z.enum([
        'gig_worker',
        'student',
        'immigrant',
        'retiree',
        'single_parent',
        'other',
      ]),
      health_score: z.number().min(0).max(100),
      income_monthly: z.number(),
      gaps: z.array(
        z.object({
          label: z.string(),
          prompt: z.string(),
        }),
      ),
    }),
    execute: async (params) => params,
  }),
}

export type AgentTools = typeof agentTools
