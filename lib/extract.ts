/**
 * Document text extraction and PDF-to-image rendering utilities.
 *
 * Strategy:
 * - PDFs: use pdf-parse for text extraction. If the result is too short
 *   (likely a scanned/image PDF), render pages to PNG images via pdf-to-img.
 * - Images: always pass through for vision processing directly.
 */

const MIN_TEXT_LENGTH = 100

export interface ExtractionResult {
  /** Extracted text content, or null if vision should be used instead */
  text: string | null
  /** True when the file should be passed to the model as images */
  useVision: boolean
  /** Base64-encoded PNG images of rendered PDF pages (for scanned PDFs) */
  images?: string[]
}

/**
 * Render PDF pages to PNG images using pdf-to-img.
 * Returns an array of base64-encoded PNG strings.
 */
async function renderPDFToImages(buffer: Buffer): Promise<string[]> {
  // pdf-to-img is ESM-only, use dynamic import
  const { pdf } = await import("pdf-to-img")

  const dataUrl = `data:application/pdf;base64,${buffer.toString("base64")}`
  const document = await pdf(dataUrl, { scale: 2.0 })

  const pages: string[] = []
  for await (const image of document) {
    pages.push(Buffer.from(image).toString("base64"))
  }

  console.log("[extract] Rendered PDF to", pages.length, "PNG page(s)")
  return pages
}

/**
 * Attempt text extraction from a PDF buffer.
 * Falls back to image rendering if text is too sparse (scanned PDF).
 */
export async function extractFromPDF(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // Dynamic import avoids issues with pdf-parse's require() in Next.js edge
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require("pdf-parse")
    const result = await pdfParse(buffer)
    const text = result.text?.trim() ?? ""

    console.log("[extract] PDF text extraction length:", text.length)

    if (text.length >= MIN_TEXT_LENGTH) {
      return { text, useVision: false }
    }

    // Too little text — likely a scanned PDF, render pages to images
    console.log("[extract] Text too short, rendering PDF pages to images")
    try {
      const images = await renderPDFToImages(buffer)
      if (images.length > 0) {
        return { text: null, useVision: true, images }
      }
    } catch (renderErr) {
      console.error("[extract] PDF image rendering failed:", renderErr instanceof Error ? renderErr.message : String(renderErr))
    }

    // If rendering also failed but we have some text, use it
    if (text.length > 0) {
      console.log("[extract] Falling back to sparse text extraction")
      return { text, useVision: false }
    }

    return { text: null, useVision: true }
  } catch {
    // Parse failure — try image rendering
    console.log("[extract] pdf-parse failed, attempting image rendering")
    try {
      const images = await renderPDFToImages(buffer)
      if (images.length > 0) {
        return { text: null, useVision: true, images }
      }
    } catch (renderErr) {
      console.error("[extract] PDF image rendering also failed:", renderErr instanceof Error ? renderErr.message : String(renderErr))
    }

    return { text: null, useVision: true }
  }
}

/**
 * Images are always analyzed via vision (no local text extraction).
 */
export function extractFromImage(): ExtractionResult {
  return { text: null, useVision: true }
}

/**
 * Extract plain text from a base64-encoded PDF.
 * Used as a last-resort fallback when image rendering is not available.
 * Returns null if extraction fails or yields no content.
 */
export async function extractTextFromBase64PDF(base64: string): Promise<string | null> {
  try {
    const buffer = Buffer.from(base64, "base64")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require("pdf-parse")
    const result = await pdfParse(buffer)
    return result.text?.trim() || null
  } catch {
    return null
  }
}
