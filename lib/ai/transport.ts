/**
 * AI Transport — OpenAI via Lava gateway.
 *
 * Single model adapter for the entire app. All LLM calls go through here.
 * Uses Lava's gateway() convenience method which handles token generation
 * and proxy URL construction internally.
 */

import { Lava } from "@lavapayments/nodejs"

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
  const secretKey = process.env.LAVA_SECRET_KEY
  if (!secretKey) {
    throw new Error("LAVA_SECRET_KEY is not set in environment")
  }

  const lava = new Lava() // Still needed to access lava.providers easily
  const OPENAI_CHAT_URL = lava.providers.openai + "/chat/completions"

  console.log("[transport] Calling OpenAI via Lava secret key")
  console.log("[transport] Endpoint:", OPENAI_CHAT_URL)
  console.log("[transport] Model:", MODEL)
  console.log("[transport] Messages count:", messages.length)

  // Log message structure summary for debugging MIME type issues
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      console.log(`[transport] Message: role=${msg.role}, content=text (${msg.content.length} chars)`)
    } else if (Array.isArray(msg.content)) {
      const parts = msg.content.map((c) => {
        if (c.type === "text") return `text(${c.text?.length ?? 0})`
        if (c.type === "image_url") return `image(${c.image_url?.url.slice(0, 30)}...)`
        return c.type
      })
      console.log(`[transport] Message: role=${msg.role}, content=[${parts.join(", ")}]`)
    }
  }

  let data: ChatCompletionResponse

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`)
    }
    data = (await response.json()) as ChatCompletionResponse
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[transport] Lava proxy error:", message)
    throw new Error(`Lava proxy request failed: ${message}`)
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    console.error("[transport] Empty response from model. Full response:", JSON.stringify(data).slice(0, 500))
    throw new Error("Empty response from OpenAI via Lava")
  }

  console.log("[transport] Response received, length:", content.length)
  return content
}

/**
 * Same as analyze, but for general chatbot use (no JSON enforcement).
 */
export async function chat(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  const secretKey = process.env.LAVA_SECRET_KEY
  if (!secretKey) {
    throw new Error("LAVA_SECRET_KEY is not set in environment")
  }

  const lava = new Lava()
  const OPENAI_CHAT_URL = lava.providers.openai + "/chat/completions"

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`)
    }
    const data = (await response.json()) as ChatCompletionResponse
    return data?.choices?.[0]?.message?.content ?? ""
  } catch (err) {
    throw new Error(`Chat request failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
