import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { DbUser, DbProfile } from '@/types/database'

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! })

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user language for agent configuration
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single() as { data: Pick<DbUser, 'id'> | null }
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('language, persona')
    .eq('user_id', dbUser.id)
    .single() as { data: Pick<DbProfile, 'language' | 'persona'> | null }

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
  if (!agentId) return NextResponse.json({ error: 'Agent not configured' }, { status: 503 })

  const { signedUrl } = await client.conversationalAi.conversations.getSignedUrl({
    agentId,
  })

  return NextResponse.json({ signedUrl, language: profile?.language || 'en' })
}
