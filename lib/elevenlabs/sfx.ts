import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! })

export async function generateSFX(description: string, durationSeconds?: number): Promise<Buffer> {
  const audio = await client.textToSoundEffects.convert({
    text: description,
    durationSeconds: durationSeconds,
    promptInfluence: 0.3,
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
