/**
 * AI Transport — OpenAI via Lava gateway.
 *
 * Single model adapter for the entire app. All LLM calls go through here.
 * Uses Lava's gateway() convenience method which handles token generation
 * and proxy URL construction internally.
 */

import { Lava } from "@lavapayments/nodejs"

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
const MODEL = "gpt-4o"

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

/**
 * Send messages to OpenAI via Lava and return the response text.
 *
 * @param messages - OpenAI-format chat messages (supports multimodal content)
 * @param temperature - Sampling temperature (default 0.1)
 * @returns The assistant's response text
 */
export async function analyze(
  messages: ChatMessage[],
  temperature = 0.1
): Promise<string> {
  const lava = new Lava() // reads LAVA_SECRET_KEY from env

  console.log("[transport] Calling OpenAI via Lava gateway")
  console.log("[transport] Endpoint:", OPENAI_CHAT_URL)
  console.log("[transport] Model:", MODEL)
  console.log("[transport] Messages count:", messages.length)

  let data: ChatCompletionResponse

  try {
    data = await lava.gateway(OPENAI_CHAT_URL, {
      body: {
        model: MODEL,
        messages,
        temperature,
        response_format: { type: "json_object" },
      },
    }) as ChatCompletionResponse
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[transport] Lava gateway error:", message)
    throw new Error(`Lava gateway request failed: ${message}`)
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    console.error("[transport] Empty response from model. Full response:", JSON.stringify(data).slice(0, 500))
    throw new Error("Empty response from OpenAI via Lava")
  }

  console.log("[transport] Response received, length:", content.length)
  return content
}
