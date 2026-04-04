import { dubAudio } from '@/lib/elevenlabs/dubbing'
import { generateMusic } from '@/lib/elevenlabs/music'
import { createClient } from '@/lib/supabase/server'
import type { MusicMood } from '@/lib/elevenlabs/music'

export const maxDuration = 60

const VALID_MOODS = ['calm', 'tense', 'curious', 'celebratory', 'silent'] as const

export async function POST(req: Request) {
  const { mood, targetLanguage } = await req.json() as { mood: MusicMood; targetLanguage: string }
  if (!mood || !targetLanguage) return new Response('mood and targetLanguage are required', { status: 400 })
  if (!mood || !VALID_MOODS.includes(mood as typeof VALID_MOODS[number])) {
    return new Response('Invalid mood', { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  try {
    // Generate English music first
    const englishAudio = await generateMusic(mood)

    // If target is not English, dub it
    if (targetLanguage !== 'en') {
      const dubbedAudio = await dubAudio(englishAudio, targetLanguage, 'en')
      if (dubbedAudio) {
        return new Response(dubbedAudio, { headers: { 'Content-Type': 'audio/mpeg' } })
      }
    }

    // Fallback to English
    return new Response(englishAudio, { headers: { 'Content-Type': 'audio/mpeg' } })
  } catch {
    return new Response('Dubbing failed', { status: 500 })
  }
}
