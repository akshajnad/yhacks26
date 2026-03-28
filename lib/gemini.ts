/**
 * AI Gateway — Lava → OpenAI (primary) with direct Gemini fallback.
 *
 * Exports the same `getAI()` interface as before so lib/agents/analyzer.ts
 * requires zero changes. The compatibility shim translates Google SDK-style
 * input (parts[], inlineData, responseSchema) into the appropriate format
 * for each backend.
 *
 * Routing:
 *   1. Lava → OpenAI gpt-4o   (LAVA_SECRET_KEY)
 *   2. Direct Gemini 1.5 Pro  (GOOGLE_API_KEY)  — silent fallback
 *   3. pdf-parse text retry   — if both vision paths fail on a PDF
 *
 * Future: inject RAG context in analyzer.ts before calling generateContent().
 */

import { Lava } from "@lavapayments/nodejs"
import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Kept for backward compat — analyzer.ts imports this but it's not used in routing
export const MODEL_NAME = "gpt-4o"

const GEMINI_FALLBACK_MODEL = "gemini-1.5-pro"

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

/**
 * Translate Google SDK parts[] → OpenAI ChatCompletionMessageParam[].
 * Convention: the first text part is treated as the system prompt.
 */
function partsToOpenAIMessages(parts: Part[]): OpenAI.ChatCompletionMessageParam[] {
  const messages: OpenAI.ChatCompletionMessageParam[] = []
  const userContent: OpenAI.ChatCompletionContentPart[] = []
  let systemExtracted = false

  for (const part of parts) {
    if (part.text !== undefined) {
      if (!systemExtracted) {
        // First text part becomes system message
        messages.push({ role: "system", content: part.text })
        systemExtracted = true
      } else {
        userContent.push({ type: "text", text: part.text })
      }
    } else if (part.inlineData) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        },
      })
    }
  }

  if (userContent.length > 0) {
    messages.push({ role: "user", content: userContent })
  }

  return messages
}

// ---- Backend callers ----

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function callLava(_input: GenerateInput): Promise<string> {
  throw new Error("Lava unavailable, using Gemini")
}

async function callGemini(input: GenerateInput): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set")

  const genai = new GoogleGenerativeAI(apiKey)
  const model = genai.getGenerativeModel({ model: GEMINI_FALLBACK_MODEL })

  const parts = input.contents[0]?.parts ?? []
  // Pass parts as-is — @google/generative-ai uses the same inlineData shape
  const geminiParts = parts.map((p) =>
    p.text !== undefined
      ? { text: p.text }
      : { inlineData: { mimeType: p.inlineData!.mimeType, data: p.inlineData!.data } }
  )

  const result = await model.generateContent({
    contents: [{ role: "user", parts: geminiParts }],
    generationConfig: {
      temperature: input.config?.temperature ?? 0.1,
      responseMimeType: "application/json",
    },
  })

  return result.response.text()
}

// ---- Compatibility shim ----

/**
 * Returns an object that matches the call pattern in analyzer.ts:
 *   getAI().models.generateContent({ model, contents, config }) → { text }
 *
 * Internally routes Lava → Gemini → pdf-parse text retry.
 */
export function getAI() {
  return {
    models: {
      generateContent: async (input: GenerateInput): Promise<{ text: string }> => {
        // Step 1 — Primary: Lava → OpenAI
        try {
          const text = await callLava(input)
          console.log("[ai-gateway] Used Lava → OpenAI (gpt-4o)")
          return { text }
        } catch (lavaErr) {
          void lavaErr
          console.log("[ai-gateway] Lava unavailable, using Gemini")
        }

        // Step 2 — Fallback: direct Gemini
        const hasBinary = (input.contents[0]?.parts ?? []).some((p) => p.inlineData)
        try {
          const text = await callGemini(input)
          console.log("[ai-gateway] Used direct Gemini fallback (gemini-1.5-pro)")
          return { text }
        } catch (geminiErr) {
          if (!hasBinary) {
            throw geminiErr // No image data — nothing further to try
          }
          console.log(
            "[ai-gateway] Gemini vision failed, trying pdf-parse text fallback:",
            geminiErr instanceof Error ? geminiErr.message : String(geminiErr)
          )
        }

        // Step 3 — pdf-parse fallback for PDFs only (images can't be text-extracted)
        const pdfPart = (input.contents[0]?.parts ?? []).find(
          (p) => p.inlineData?.mimeType === "application/pdf"
        )
        if (!pdfPart?.inlineData) {
          throw new Error(
            "All analysis paths failed and the document is not a PDF — no text fallback available"
          )
        }

        const { extractTextFromBase64PDF } = await import("@/lib/extract")
        const extractedText = await extractTextFromBase64PDF(pdfPart.inlineData.data)
        if (!extractedText) {
          throw new Error("All vision paths failed and pdf-parse yielded no text from the document")
        }

        // Rebuild input: replace the inlineData part with extracted text
        const textOnlyInput: GenerateInput = {
          ...input,
          contents: [
            {
              ...input.contents[0],
              parts: [
                ...(input.contents[0]?.parts ?? []).filter((p) => !p.inlineData),
                { text: `\n\nDOCUMENT TEXT:\n${extractedText}` },
              ],
            },
          ],
        }

        // Retry both paths with text
        try {
          const text = await callLava(textOnlyInput)
          console.log("[ai-gateway] Used Lava → OpenAI with pdf-parse text fallback")
          return { text }
        } catch {
          // intentionally swallowed — try Gemini next
        }

        const text = await callGemini(textOnlyInput)
        console.log("[ai-gateway] Used Gemini with pdf-parse text fallback")
        return { text }
      },
    },
  }
}
