import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { anthropicSdk } from '@/lib/ai/anthropic'
import { addDocumentMemory } from '@/lib/supermemory/client'
import type { DocumentKind, DocumentExplanation } from '@/types/database'

export const maxDuration = 120

export async function POST(req: Request) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const isOnboarding = formData.get('isOnboarding') === 'true'

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: dbUser } = await (supabase.from('users') as any)
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!dbUser) return NextResponse.json(null, { status: 404 })

  // Upload to Supabase Storage
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const storagePath = `${user.id}/documents/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('vela-files')
    .upload(storagePath, buffer, { contentType: file.type })
  if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

  // Send to Claude for extraction
  const base64 = buffer.toString('base64')
  const mimeType = file.type as 'application/pdf' | 'image/png' | 'image/jpeg'

  const extractionPrompt = `Analyze this financial document. Return a JSON object with:
{
  "document_type": "insurance|lease|bill|payslip|other",
  "extracted_numbers": { "income": number|null, "expenses": object|null, "total_due": number|null },
  "clauses": [{ "label": string, "plain": string, "risk": "low|medium|high", "detail": string }],
  "risk_flags": [string],
  "plain_summaries": [string],
  "what_ifs": [{ "label": string, "simulation_id": string }]
}
Keep plain language simple. Return only valid JSON.`

  const response = await anthropicSdk.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          } as any,
          { type: 'text', text: extractionPrompt },
        ],
      },
    ],
  })

  let explanation: DocumentExplanation
  let extractedNumbers: { income?: number; expenses?: Record<string, number> } = {}
  try {
    const text = (response.content[0] as { type: string; text: string }).text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const parsed = JSON.parse(jsonMatch[0])
    explanation = {
      document_type: parsed.document_type as DocumentKind,
      clauses: parsed.clauses || [],
      risk_flags: parsed.risk_flags || [],
      plain_summaries: parsed.plain_summaries || [],
      what_ifs: parsed.what_ifs || [],
    }
    extractedNumbers = parsed.extracted_numbers || {}
  } catch {
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }

  // Save document record
  const { data: doc } = await (supabase.from('documents') as any)
    .insert({
      user_id: dbUser.id,
      filename: file.name,
      storage_path: storagePath,
      document_type: explanation.document_type,
      ai_explanation: explanation,
    })
    .select()
    .single()

  // Store document insights in Supermemory for persistent cross-session recall
  if (doc && explanation) {
    const memoryContent = [
      `Document: "${file.name}" (${explanation.document_type})`,
      explanation.plain_summaries[0] ? `Summary: ${explanation.plain_summaries[0]}` : '',
      explanation.risk_flags.length > 0 ? `Risk flags: ${explanation.risk_flags.join('; ')}` : '',
      explanation.clauses.filter((c) => c.risk === 'high').length > 0
        ? `High-risk clauses: ${explanation.clauses
            .filter((c) => c.risk === 'high')
            .map((c) => c.label)
            .join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('. ')

    addDocumentMemory(user.id, doc.id, memoryContent, {
      documentType: explanation.document_type,
      filename: file.name,
    }).catch(() => {}) // fire-and-forget — don't block response
  }

  // If onboarding: update profile with extracted numbers
  if (isOnboarding && extractedNumbers) {
    const profileUpdate: Record<string, unknown> = { onboarding_completed: true }
    if (extractedNumbers.income) profileUpdate.income_monthly = extractedNumbers.income
    if (extractedNumbers.expenses) profileUpdate.expenses = extractedNumbers.expenses
    await fetch(new URL('/api/profile/update', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: req.headers.get('cookie') ?? '' },
      body: JSON.stringify(profileUpdate),
    })
  }

  return NextResponse.json({ document: doc, explanation })
}
