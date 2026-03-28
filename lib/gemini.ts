import { GoogleGenAI } from "@google/genai"

/** Model name — override via GEMINI_MODEL env var for easy upgrades */
export const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-2.0-flash"

/**
 * Lazily creates and returns the Gemini AI client.
 * Throws at call-time (not module load) if the API key is missing,
 * so the build succeeds without env vars set.
 */
export function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required")
  }
  return new GoogleGenAI({ apiKey })
}
