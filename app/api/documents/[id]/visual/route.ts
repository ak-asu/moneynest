import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateConceptImage } from '@/lib/gemini/image'
import { NextResponse } from 'next/server'
import type { DocumentKind, DocumentExplanation } from '@/types/database'

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildImagePrompt(docType: DocumentKind, explanation: DocumentExplanation | null): string {
  const highRisk = explanation?.clauses.filter(c => c.risk === 'high') ?? []
  const mediumRisk = explanation?.clauses.filter(c => c.risk === 'medium') ?? []
  const totalRisk = highRisk.length + mediumRisk.length
  const riskFlags = explanation?.risk_flags?.slice(0, 3) ?? []
  const summary = explanation?.plain_summaries?.[0]?.slice(0, 150) ?? ''

  // Risk severity tone to weave into the scene
  const riskTone =
    highRisk.length >= 5 ? 'urgent warning atmosphere with red caution symbols' :
    highRisk.length >= 2 ? 'cautious amber warning mood with alert badges' :
    totalRisk > 0 ? 'mild advisory feel with subtle caution indicators' :
    'calm and reassuring safe atmosphere'

  // Key clause labels for visual detail
  const clauseDetails = highRisk.slice(0, 2).map(c => c.label).join(', ')

  // Flag-driven visual elements
  const flagDetail = riskFlags.length > 0
    ? `Visual elements referencing: ${riskFlags.join('; ')}.`
    : ''

  // Document-type scene
  let scene: string
  switch (docType) {
    case 'insurance':
      scene = highRisk.length >= 3
        ? `A protective shield with visible cracks and gaps, representing coverage gaps in an insurance policy. Warning triangles mark the weak spots. ${clauseDetails ? `Labels near cracks hint at: ${clauseDetails}.` : ''} A home, car, and medical cross are partially shielded — some in shadow indicating gaps.`
        : `A strong protective shield glowing softly, covering a home, car, and medical cross. Small badge indicators show clause health. Reassuring yet informative scene.`
      break

    case 'lease':
      scene = highRisk.length >= 3
        ? `A rental agreement scroll with magnified danger zones highlighted in amber and red. A key with warning tags hangs beside it. A scale tips slightly toward the landlord side, representing imbalanced clauses. ${clauseDetails ? `Floating labels show concern areas: ${clauseDetails}.` : ''}`
        : `A rental agreement document with a key and handshake. Green checkmarks on most clauses. A balanced scale between tenant and landlord. Warm and welcoming apartment building in background.`
      break

    case 'bill':
      scene = highRisk.length >= 2
        ? `A utility bill with a meter spiking into the red zone. Stacked coins shrinking. A calendar showing due dates with urgency markers. A person looking at a large bill amount with concern. Budget bar nearly depleted.`
        : `A utility bill with a meter in the green zone. Coins stacked comfortably beside it. A calendar with a clear due date. A person reviewing their bill with confidence. Budget bars healthy.`
      break

    case 'payslip':
      scene = `A clear payslip breakdown showing three horizontal bars: a full gross pay bar in purple, a deductions bar in pink (taxes and FICA), and a final net pay bar in green — the take-home amount. A smiling person holds the slip. Small icons for savings jar and piggy bank on the side.`
      break

    default:
      scene = `A magnifying glass over a financial document, revealing hidden details and key numbers. Checkmarks and exclamation marks float above clauses. A lightbulb represents understanding and financial literacy. ${summary ? `Scene relates to: ${summary.slice(0, 80)}.` : ''}`
  }

  return `${scene} ${flagDetail} Overall mood: ${riskTone}. Flat design, soft pastel color palette, no text or numbers in the image, clean minimalist illustration style, educational infographic feel.`
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = await (supabase.from('users') as any)
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!dbUser) return NextResponse.json(null, { status: 401 })

  const { data: doc } = await (supabase.from('documents') as any)
    .select('id, document_type, ai_explanation')
    .eq('id', id)
    .eq('user_id', dbUser.id)
    .single()
  if (!doc) return NextResponse.json(null, { status: 404 })

  // Return cached image if exists
  const storagePath = `document-visuals/${id}.png`
  const { data: existing } = await supabaseAdmin.storage
    .from('vela-files')
    .createSignedUrl(storagePath, 3600)
  if (existing?.signedUrl) {
    return NextResponse.json({ url: existing.signedUrl })
  }

  // Generate new image
  const prompt = buildImagePrompt(doc.document_type as DocumentKind, doc.ai_explanation as DocumentExplanation | null)
  const dataUrl = await generateConceptImage(prompt)
  if (!dataUrl) return NextResponse.json({ url: null })

  // Upload to Supabase Storage for caching (admin client bypasses RLS)
  const base64Data = dataUrl.split(',')[1]
  const buffer = Buffer.from(base64Data, 'base64')
  const { error: uploadError } = await supabaseAdmin.storage
    .from('vela-files')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    // Storage unavailable — return inline data URI directly
    return NextResponse.json({ url: dataUrl })
  }

  const { data: signed } = await supabaseAdmin.storage
    .from('vela-files')
    .createSignedUrl(storagePath, 3600)
  return NextResponse.json({ url: signed?.signedUrl ?? dataUrl })
}
