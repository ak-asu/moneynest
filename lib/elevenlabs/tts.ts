import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! })

// Default voice IDs per persona — update with real ElevenLabs voice IDs from dashboard
export const PERSONA_VOICE_MAP: Record<string, string> = {
  gig_worker: 'EXAVITQu4vr4xnSDxMaL', // Sarah — warm, conversational
  student: 'TX3LPaxmHKxFdv7VOQHJ', // Liam — young, clear
  immigrant: 'pqHfZKP75CvOlQylNhV4', // Bill — measured, neutral
  retiree: 'onwK4e9ZLuTAKqWW03F9', // Daniel — calm, authoritative
  single_parent: 'XB0fDUnXU5powFXDhCwa', // Charlotte — warm female
  other: 'EXAVITQu4vr4xnSDxMaL', // default Sarah
}

export const LANGUAGE_VOICE_MAP: Record<string, string> = {
  en: 'EXAVITQu4vr4xnSDxMaL',
  es: 'XrExE9yKIg1WjnnlVkGX', // Matilda — Spanish capable
}

export async function generateSpeech(
  text: string,
  voiceId: string,
  languageCode: string = 'en'
): Promise<Buffer> {
  const audio = await client.textToSpeech.convert(voiceId, {
    text,
    modelId: 'eleven_multilingual_v2',
    voiceSettings: { stability: 0.5, similarityBoost: 0.75 },
    languageCode: languageCode !== 'en' ? languageCode : undefined,
  })

  // Collect stream into buffer
  const reader = (audio as ReadableStream<Uint8Array>).getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return Buffer.from(Buffer.concat(chunks))
}
