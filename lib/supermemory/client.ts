import Supermemory from 'supermemory'

function getClient(): Supermemory | null {
  if (!process.env.SUPERMEMORY_API_KEY) return null
  return new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY })
}

/**
 * Store a document's extracted insights as a persistent memory for the user.
 * Uses the document ID as customId for deduplication — re-uploading the same
 * doc overwrites the old memory rather than creating a duplicate.
 */
export async function addDocumentMemory(
  userId: string,
  docId: string,
  content: string,
  metadata: Record<string, string | number | boolean> = {},
): Promise<void> {
  const client = getClient()
  if (!client) return
  try {
    await client.add({
      content,
      customId: docId,
      containerTags: [userId],
      metadata: { docId, ...metadata },
    })
  } catch (err) {
    console.error('[supermemory] addDocumentMemory error:', err)
  }
}

/**
 * Search the user's stored memories for content relevant to a query.
 * Returns plain-text memory strings ready to inject into the system prompt.
 */
export async function searchDocumentMemories(
  userId: string,
  query: string,
  limit = 5,
): Promise<string[]> {
  const client = getClient()
  if (!client) return []
  try {
    const response = await client.search.execute({
      q: query,
      containerTags: [userId],
      limit,
    })
    return (response.results ?? [])
      .map(r => r.content ?? '')
      .filter(Boolean)
  } catch (err) {
    console.error('[supermemory] searchDocumentMemories error:', err)
    return []
  }
}
