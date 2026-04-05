import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generateConceptImage(prompt: string): Promise<string | null> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-preview-image-generation' })

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `Simple, friendly illustration for financial education: ${prompt}. Flat design, pastel colors, no text in image, clean and clear.` }]
      }],
      // responseModalities is not typed in @google/generative-ai v0.24.1 but is
      // supported by the gemini-2.0-flash-preview-image-generation model at runtime.
      generationConfig: { responseModalities: ['IMAGE'] } as any,
    })

    const imagePart = result.response.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    )

    if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) return null

    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
  } catch (err) {
    console.error('Gemini image error:', err)
    return null
  }
}
