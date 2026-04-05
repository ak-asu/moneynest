// lib/ai/chat.ts
export async function callClaude(message: string, sessionId?: string): Promise<string> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        sessionId: sessionId || 'mini-game-session'
      }),
    });
    if (!response.ok) {
      throw new Error('Claude call failed');
    }
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body not available');
    }
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += new TextDecoder().decode(value);
    }
    return result;
  } catch (error) {
    console.error('Error calling Claude:', error);
    return 'Sorry, I couldn\'t get advice right now.';
  }
}