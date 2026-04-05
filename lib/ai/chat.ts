export async function callClaude(prompt: string): Promise<string> {
  try {
    const response = await fetch('/api/ai-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    if (!response.ok) throw new Error('Claude call failed')
    const { text } = await response.json()
    return text ?? ''
  } catch (error) {
    console.error('Error calling Claude:', error)
    return ''
  }
}
