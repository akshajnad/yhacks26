/**
 * POST /api/analyze
 *
 * Accepts: multipart/form-data with:
 *   - `bill` (required) + `eob` (required) + `denialLetter` (optional)
 *   - OR legacy single `file` field
 *
 * Returns: AnalysisResult JSON
 *
 * Pipeline:
 * 1. Parse uploaded files
 * 2. Extract text (pdf-parse) or flag for vision per file
 * 3. Call analyzer agent
 * 4. Return structured result
 */

import { NextRequest, NextResponse } from "next/server"
import { extractFromPDF, extractFromImage } from "@/lib/extract"
import { analyzeDocument, analyzeDocuments } from "@/lib/agents/analyzer"
import type { AnalyzeInput } from "@/lib/agents/analyzer"
import type { AnalysisResult } from "@/types/analysis"

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20MB

function validateFile(file: unknown, fieldName: string): File | null {
  if (!file || !(file instanceof File)) return null

  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type for ${fieldName}: ${file.type}. Accepted: PDF, JPEG, PNG, WebP, HEIC`)
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`${fieldName} too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 20MB.`)
  }

  return file
}

async function extractFile(file: File): Promise<AnalyzeInput> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let text: string | null = null
  let useVision = false
  let images: string[] | undefined

  if (file.type === "application/pdf") {
    const extraction = await extractFromPDF(buffer)
    text = extraction.text
    useVision = extraction.useVision
    images = extraction.images
    console.log(`[/api/analyze] PDF extraction for ${file.name}:`, {
      textLength: text?.length ?? 0,
      useVision,
      renderedPages: images?.length ?? 0,
    })
  } else {
    const extraction = extractFromImage()
    text = extraction.text
    useVision = extraction.useVision
    console.log(`[/api/analyze] Image file ${file.name}, using vision directly`)
  }

  const imageBase64 = useVision && !images?.length ? buffer.toString("base64") : null

  return {
    text,
    imageBase64,
    images,
    mimeType: file.type,
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Request must be multipart/form-data" },
        { status: 400 }
      )
    }

    const formData = await req.formData()

    // --- Multi-file path: bill + eob + optional denialLetter ---
    const billRaw = formData.get("bill")
    const eobRaw = formData.get("eob")

    if (billRaw && eobRaw) {
      console.log("[/api/analyze] Multi-file upload detected")

      const bill = validateFile(billRaw, "Medical Bill")
      const eob = validateFile(eobRaw, "EOB")

      if (!bill || !eob) {
        return NextResponse.json(
          { error: "Both medical bill and EOB files are required." },
          { status: 400 }
        )
      }

      const denialLetterRaw = formData.get("denialLetter")
      const denialLetter = denialLetterRaw ? validateFile(denialLetterRaw, "Denial Letter") : null

      console.log("[/api/analyze] Files received:", {
        bill: `${bill.name} (${bill.type})`,
        eob: `${eob.name} (${eob.type})`,
        denialLetter: denialLetter ? `${denialLetter.name} (${denialLetter.type})` : "none",
      })

      const [billInput, eobInput] = await Promise.all([
        extractFile(bill),
        extractFile(eob),
      ])

      const denialInput = denialLetter ? await extractFile(denialLetter) : undefined

      const result: AnalysisResult = await analyzeDocuments({
        bill: billInput,
        eob: eobInput,
        denialLetter: denialInput,
      })

      return NextResponse.json(result)
    }

    // --- Legacy single-file path ---
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No files provided. Include `bill` and `eob` fields, or a single `file` field." },
        { status: 400 }
      )
    }

    console.log("[/api/analyze] Single-file upload (legacy)")

    validateFile(file, "file")

    const input = await extractFile(file)
    const result: AnalysisResult = await analyzeDocument(input)

    return NextResponse.json(result)
  } catch (err) {
    console.error("[/api/analyze] Error:", err)

    const message = err instanceof Error ? err.message : "Unknown error"

    if (message.includes("LAVA_SECRET_KEY")) {
      return NextResponse.json(
        { error: "Lava API key not configured. Set LAVA_SECRET_KEY in .env.local." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    )
  }
}
