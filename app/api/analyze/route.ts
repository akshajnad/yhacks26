/**
 * POST /api/analyze
 *
 * Accepts: multipart/form-data with a `file` field (PDF or image)
 * Returns: AnalysisResult JSON
 *
 * Pipeline:
 * 1. Parse uploaded file
 * 2. Extract text (pdf-parse) or flag for vision
 * 3. Call analyzer agent (Gemini)
 * 4. Return structured result
 *
 * Future integration points:
 * - Auth: check session/token before processing
 * - Persistence: save result to Supabase `cases` table
 * - RAG: store embedding to knowledge_base table after analysis
 * - Action routing: trigger action agent if auto-dispatch is enabled
 */

import { NextRequest, NextResponse } from "next/server"
import { extractFromPDF, extractFromImage } from "@/lib/extract"
import { analyzeDocument } from "@/lib/agents/analyzer"
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
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Include a `file` field in the form data." },
        { status: 400 }
      )
    }

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Accepted: PDF, JPEG, PNG, WebP, HEIC` },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 20MB.` },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // --- Step 1: Extract text or prepare for vision ---
    let text: string | null = null
    let useVision = false

    if (file.type === "application/pdf") {
      const result = await extractFromPDF(buffer)
      text = result.text
      useVision = result.useVision
    } else {
      const result = extractFromImage()
      text = result.text
      useVision = result.useVision
    }

    // --- Step 2: Analyze with Gemini ---
    const imageBase64 = useVision ? buffer.toString("base64") : null

    const result: AnalysisResult = await analyzeDocument({
      text,
      imageBase64,
      mimeType: file.type,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error("[/api/analyze] Error:", err)

    const message = err instanceof Error ? err.message : "Unknown error"

    // Surface Gemini API errors clearly
    if (message.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        { error: "Gemini API key not configured. Set GEMINI_API_KEY in .env.local." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    )
  }
}
