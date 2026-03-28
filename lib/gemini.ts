/**
 * AI Gateway — compatibility shim for analyzer.ts.
 *
 * Exports the same `getAI()` interface that analyzer.ts uses:
 *   getAI().models.generateContent({ model, contents, config }) → { text }
 *
 * Internally translates Google SDK-style input (parts[], inlineData)
 * into OpenAI chat messages and delegates to lib/ai/transport.ts
 * which routes everything through Lava → OpenAI.
 */

import { analyze } from "@/lib/ai/transport"

export const MODEL_NAME = "gpt-4o"

// ---- Internal types (mirror the shape analyzer.ts passes in) ----

interface Part {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

interface GenerateInput {
  model: string
  contents: Array<{ role: string; parts: Part[] }>
  config?: {
    responseMimeType?: string
    responseSchema?: unknown
    temperature?: number
  }
}

// ---- Message format translation ----

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

/**
 * Translate Google SDK parts[] → OpenAI ChatCompletionMessageParam[].
 * Convention: the first text part is treated as the system prompt.
 */
function partsToOpenAIMessages(parts: Part[]): ChatMessage[] {
  const messages: ChatMessage[] = []
  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = []
  let systemExtracted = false

  for (const part of parts) {
    if (part.text !== undefined) {
      if (!systemExtracted) {
        messages.push({ role: "system", content: part.text })
        systemExtracted = true
      } else {
        userContent.push({ type: "text", text: part.text })
      }
    } else if (part.inlineData) {
      const mime = part.inlineData.mimeType
      if (!mime.startsWith("image/")) {
        console.error(`[ai-gateway] BLOCKED non-image inlineData with MIME type: ${mime} — this would cause an OpenAI 400 error`)
        throw new Error(`Cannot send non-image MIME type "${mime}" as image_url to OpenAI. PDFs must be converted to images first.`)
      }
      const dataUri = `data:${mime};base64,${part.inlineData.data}`
      console.log(`[ai-gateway] image_url prefix: ${dataUri.slice(0, 50)}...`)
      userContent.push({
        type: "image_url",
        image_url: { url: dataUri },
      })
    }
  }

  if (userContent.length > 0) {
    messages.push({ role: "user", content: userContent })
  }

  // Log final message structure
  const structureSummary = messages.map((m) => {
    if (typeof m.content === "string") return `${m.role}(text)`
    const textCount = m.content.filter((c) => c.type === "text").length
    const imgCount = m.content.filter((c) => c.type === "image_url").length
    return `${m.role}(${textCount} text, ${imgCount} images)`
  }).join(", ")
  console.log(`[ai-gateway] Final messages: [${structureSummary}]`)

  return messages
}

// ---- Compatibility shim ----

/**
 * Returns an object matching the call pattern in analyzer.ts:
 *   getAI().models.generateContent({ model, contents, config }) → { text }
 *
 * Routes all calls through Lava → OpenAI (single path, no fallbacks).
 */
export function getAI() {
  return {
    models: {
      generateContent: async (input: GenerateInput): Promise<{ text: string }> => {
        const parts = input.contents[0]?.parts ?? []
        const messages = partsToOpenAIMessages(parts)
        const temperature = input.config?.temperature ?? 0.1

        console.log("[ai-gateway] Converting parts to OpenAI messages")
        console.log("[ai-gateway] Parts count:", parts.length)
        console.log("[ai-gateway] Has images:", parts.some((p) => p.inlineData !== undefined))

        const text = await analyze(messages, temperature)
        console.log("[ai-gateway] Analysis complete, response length:", text.length)

        return { text }
      },
    },
  }
}
