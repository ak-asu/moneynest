import { generateText } from 'ai'
import { anthropicProvider } from '@/lib/ai/anthropic'

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()
    const { text } = await generateText({
      model: anthropicProvider('claude-haiku-4-5-20251001'),
      prompt,
    })
    return Response.json({ text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
