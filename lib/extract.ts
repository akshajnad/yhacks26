/**
 * Document text extraction utilities.
 *
 * Strategy:
 * - PDFs: use pdf-parse for text extraction. If the result is too short
 *   (likely a scanned/image PDF), fall back to Gemini vision.
 * - Images: always use Gemini vision directly.
 *
 * Future: add OCR pipeline, multi-page handling, table extraction.
 */

const MIN_TEXT_LENGTH = 100

export interface ExtractionResult {
  /** Extracted text content, or null if vision should be used instead */
  text: string | null
  /** True when the file should be passed to Gemini as an inline image/PDF */
  useVision: boolean
}

/**
 * Attempt text extraction from a PDF buffer.
 * Falls back to vision if text is too sparse (scanned PDF).
 */
export async function extractFromPDF(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // Dynamic import avoids issues with pdf-parse's require() in Next.js edge
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require("pdf-parse")
    const result = await pdfParse(buffer)
    const text = result.text?.trim() ?? ""

    if (text.length >= MIN_TEXT_LENGTH) {
      return { text, useVision: false }
    }

    // Too little text — likely a scanned PDF, use vision
    return { text: null, useVision: true }
  } catch {
    // Parse failure — fall back to vision
    return { text: null, useVision: true }
  }
}

/**
 * Images are always analyzed via Gemini vision (no local text extraction).
 */
export function extractFromImage(): ExtractionResult {
  return { text: null, useVision: true }
}
