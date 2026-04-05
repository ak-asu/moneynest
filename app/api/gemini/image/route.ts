import { generateConceptImage } from '@/lib/gemini/image'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { prompt, concept } = await req.json()
  if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
    return NextResponse.json({ url: null }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const SAFE_CONCEPT = /^[a-zA-Z0-9_-]{1,100}$/
  if (concept && !SAFE_CONCEPT.test(concept)) {
    return NextResponse.json({ url: null }, { status: 400 })
  }

  // Check if we already have this concept image in storage
  if (concept && typeof concept === 'string') {
    const storagePath = `concept-illustrations/${concept}.png`
    const { data: existing } = await supabase.storage
      .from('vela-files')
      .createSignedUrl(storagePath, 3600)

    if (existing?.signedUrl) {
      return NextResponse.json({ url: existing.signedUrl })
    }
  }

  // Generate new image
  const dataUrl = await generateConceptImage(prompt)
  if (!dataUrl) return NextResponse.json({ url: null })

  // Upload to Supabase storage for reuse (if concept tag provided)
  if (concept && typeof concept === 'string') {
    try {
      const storagePath = `concept-illustrations/${concept}.png`
      const base64Data = dataUrl.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')
      await supabase.storage
        .from('vela-files')
        .upload(storagePath, buffer, { contentType: 'image/png', upsert: true })

      const { data: signed } = await supabase.storage
        .from('vela-files')
        .createSignedUrl(storagePath, 3600)

      if (signed?.signedUrl) {
        return NextResponse.json({ url: signed.signedUrl })
      }
      // Upload succeeded but signed URL unavailable
      return NextResponse.json({ url: null })
    } catch (err) {
      console.error('Storage upload error:', err)
      return NextResponse.json({ url: null })
    }
  }

  // No concept tag — return inline data URI (one-off, no caching)
  return NextResponse.json({ url: dataUrl })
}
