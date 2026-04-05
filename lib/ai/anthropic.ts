import { createAnthropic } from '@ai-sdk/anthropic'
import Anthropic from '@anthropic-ai/sdk'

function normalizeApiKey(rawKey: string): string {
  return rawKey.trim().replace(/^['"]|['"]$/g, '')
}

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 18) {
    return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`
  }
  return `${apiKey.slice(0, 12)}...${apiKey.slice(-6)}`
}

function getAnthropicApiKey(): string {
  const canonicalKey = process.env.ANTHROPIC_API_KEY
  const typoKey = process.env.ANTHOPIC_API_KEY

  if (canonicalKey && typoKey) {
    const normalizedCanonical = normalizeApiKey(canonicalKey)
    const normalizedTypo = normalizeApiKey(typoKey)
    if (normalizedCanonical !== normalizedTypo) {
      throw new Error(
        'Both ANTHROPIC_API_KEY and ANTHOPIC_API_KEY are set with different values. Remove the typo variable and keep only ANTHROPIC_API_KEY.',
      )
    }
  }

  const rawKey = canonicalKey ?? typoKey
  if (!rawKey) {
    throw new Error(
      'Missing ANTHROPIC_API_KEY environment variable. If you recently changed .env, restart the dev server.',
    )
  }

  // Normalize common copy/paste issues from .env values.
  const normalized = normalizeApiKey(rawKey)
  if (!normalized) {
    throw new Error('ANTHROPIC_API_KEY is empty after normalization')
  }

  if (!normalized.startsWith('sk-ant-')) {
    throw new Error('ANTHROPIC_API_KEY has an unexpected format; expected key prefix sk-ant-.')
  }

  if (/\s/.test(normalized)) {
    throw new Error('ANTHROPIC_API_KEY must not include whitespace characters.')
  }

  if (process.env.DEBUG_AI_AUTH === '1') {
    const source = canonicalKey ? 'ANTHROPIC_API_KEY' : 'ANTHOPIC_API_KEY'
    console.info(`[anthropic] Loaded API key from ${source}: ${maskApiKey(normalized)}`)
  }

  return normalized
}

const anthropicApiKey = getAnthropicApiKey()

export const anthropicProvider = createAnthropic({ apiKey: anthropicApiKey })
export const anthropicSdk = new Anthropic({ apiKey: anthropicApiKey })
