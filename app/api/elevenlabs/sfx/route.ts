import { generateSFX } from '@/lib/elevenlabs/sfx'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { description, duration } = await req.json()
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return new Response('description is required', { status: 400 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  try {
    const buffer = await generateSFX(description, duration)
    return new Response(buffer, { headers: { 'Content-Type': 'audio/mpeg' } })
  } catch (err) {
    console.error('SFX error:', err)
    return new Response('SFX failed', { status: 500 })
  }
}
