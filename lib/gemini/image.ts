import { geminiAI } from './client'

export async function generateConceptImage(prompt: string): Promise<string | null> {
  try {
    const response = await geminiAI.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: `Simple, friendly illustration for financial education: ${prompt}. Flat design, pastel colors, no text in image, clean and clear.`,
    })

    const parts = response.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: any) => p.inlineData)

    if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) return null

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
  } catch (err) {
    console.error('Gemini image error:', err)
    return null
  }
}
