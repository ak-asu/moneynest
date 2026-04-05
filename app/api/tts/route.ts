const ELEVENLABS_API = 'https://api.elevenlabs.io/v1/text-to-speech'

export async function POST(req: Request) {
  const { text, voiceId = 'EXAVITQu4vr4xnSDxMaL' } = await req.json() as {
    text: string
    voiceId?: string
  }

  if (!text?.trim()) return new Response('text is required', { status: 400 })

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return new Response('ElevenLabs not configured', { status: 503 })

  const res = await fetch(`${ELEVENLABS_API}/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })

  if (!res.ok) return new Response('TTS failed', { status: 502 })

  return new Response(res.body, {
    headers: { 'Content-Type': 'audio/mpeg' },
  })
}
