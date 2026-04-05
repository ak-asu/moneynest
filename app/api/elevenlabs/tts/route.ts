import { generateSpeech, PERSONA_VOICE_MAP, LANGUAGE_VOICE_MAP } from '@/lib/elevenlabs/tts'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { text, voiceId, language, persona } = await req.json()

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return new Response('text is required', { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Resolve voice ID: explicit > persona default > language default
  const resolvedVoiceId =
    voiceId ||
    PERSONA_VOICE_MAP[persona] ||
    LANGUAGE_VOICE_MAP[language || 'en'] ||
    PERSONA_VOICE_MAP.other

  try {
    const audioBuffer = await generateSpeech(text, resolvedVoiceId, language || 'en')
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('TTS error:', err)
    return new Response('TTS generation failed', { status: 500 })
  }
}
