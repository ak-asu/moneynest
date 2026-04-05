import { generateMusic, type MusicMood } from '@/lib/elevenlabs/music'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  let mood: MusicMood
  try {
    const body = (await req.json()) as { mood: MusicMood }
    mood = body.mood
  } catch {
    return new Response('mood is required', { status: 400 })
  }
  if (!mood) return new Response('mood is required', { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  try {
    const buffer = await generateMusic(mood)
    if (buffer.length === 0) return new Response(null, { status: 204 })
    return new Response(buffer, { headers: { 'Content-Type': 'audio/mpeg' } })
  } catch (err) {
    console.error('Music generation error:', err)
    return new Response(null, { status: 204 }) // graceful fallback — music is non-critical
  }
}
