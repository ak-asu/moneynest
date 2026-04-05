import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! })

export async function dubAudio(
  audioBuffer: Buffer,
  targetLanguage: string,
  sourceLanguage: string = 'en',
  signal?: AbortSignal
): Promise<Buffer | null> {
  if (targetLanguage === sourceLanguage) return null

  try {
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })

    const dubResponse = await client.dubbing.create({
      file: blob as any,
      targetLang: targetLanguage,
      sourceLang: sourceLanguage,
      numSpeakers: 1,
    })

    // Poll for completion (max 20 attempts × 3s = 60s)
    let status = 'dubbing'
    let attempts = 0
    while (status === 'dubbing' && attempts < 20) {
      if (signal?.aborted) return null
      await new Promise((r) => setTimeout(r, 3000))
      const metadata = await client.dubbing.get(dubResponse.dubbingId)
      status = metadata.status
      attempts++
    }

    if (status !== 'dubbed') return null

    const dubbed = await client.dubbing.audio.get(dubResponse.dubbingId, targetLanguage)
    const reader = dubbed.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    return Buffer.from(Buffer.concat(chunks))
  } catch (err) {
    console.error('Dubbing error:', err)
    return null
  }
}
