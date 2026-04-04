import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! })

export type MusicMood = 'calm' | 'tense' | 'curious' | 'celebratory' | 'silent'

const MOOD_PROMPTS: Record<MusicMood, string> = {
  calm: 'gentle lo-fi piano background music, soft and focused, no lyrics',
  tense: 'urgent minor key strings, building tension, financial thriller atmosphere',
  curious: 'light warm acoustic guitar, curious and hopeful, educational mood',
  celebratory: 'upbeat pop celebration music, achievement unlocked, positive energy',
  silent: '',
}

export async function generateMusic(mood: MusicMood): Promise<Buffer> {
  if (mood === 'silent') return Buffer.alloc(0)
  const audio = await client.textToSoundEffects.convert({
    text: MOOD_PROMPTS[mood],
    durationSeconds: 30,
    promptInfluence: 0.5,
  })
  const reader = (audio as ReadableStream<Uint8Array>).getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return Buffer.from(Buffer.concat(chunks))
}
