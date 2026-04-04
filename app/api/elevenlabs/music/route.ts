import { generateMusic, type MusicMood } from '@/lib/elevenlabs/music'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { mood } = await req.json() as { mood: MusicMood }
  if (!mood) return new Response('mood is required', { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  try {
    const buffer = await generateMusic(mood)
    if (buffer.length === 0) return new Response(null, { status: 204 })
    return new Response(buffer, { headers: { 'Content-Type': 'audio/mpeg' } })
  } catch {
    return new Response('Music generation failed', { status: 500 })
  }
}
