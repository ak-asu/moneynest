import { createAnthropic } from '@ai-sdk/anthropic'
import Anthropic from '@anthropic-ai/sdk'

function getAnthropicApiKey(): string {
  const rawKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHOPIC_API_KEY
  if (!rawKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable')
  }

  // Normalize common copy/paste issues from .env values.
  const normalized = rawKey.trim().replace(/^['"]|['"]$/g, '')
  if (!normalized) {
    throw new Error('ANTHROPIC_API_KEY is empty after normalization')
  }

  return normalized
}

const anthropicApiKey = getAnthropicApiKey()

export const anthropicProvider = createAnthropic({ apiKey: anthropicApiKey })
export const anthropicSdk = new Anthropic({ apiKey: anthropicApiKey })
