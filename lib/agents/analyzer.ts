/**
 * Analyzer Agent — Module 1 of the MedBill dispute pipeline.
 *
 * Responsibilities:
 * - Accept raw document content (text or image bytes)
 * - Call Gemini with a structured prompt and response schema
 * - Return a typed AnalysisResult with a stable caseId
 *
 * Extension points (for later modules):
 * - RAG context injection: add `injectRAGContext()` call before generateContent()
 * - Multi-turn reasoning: replace single generate call with a chat session
 * - Action routing: post-process recommendedActions to assign agentType
 */

import { v4 as uuidv4 } from "uuid"
import { getAI, MODEL_NAME } from "@/lib/gemini"
import type { AnalysisResult, ExtractedFields, DetectedIssue, RecommendedAction } from "@/types/analysis"

export interface AnalyzeInput {
  /** Extracted text (for text-based PDFs) */
  text?: string | null
  /** Base64-encoded file content (for single images) */
  imageBase64?: string | null
  /** Base64-encoded PNG images of rendered PDF pages (for scanned PDFs) */
  images?: string[]
  /** MIME type of the original file */
  mimeType: string
}

// ---- Gemini response schema (mirrors AnalysisResult minus caseId/analyzedAt) ----

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    extractedFields: {
      type: "object",
      properties: {
        provider: { type: "string", nullable: true },
        insurer: { type: "string", nullable: true },
        billedAmount: { type: "number", nullable: true },
        insurerPaid: { type: "number", nullable: true },
        patientResponsibility: { type: "number", nullable: true },
        denialReason: { type: "string", nullable: true },
        cptCodes: { type: "array", items: { type: "string" } },
        serviceDate: { type: "string", nullable: true },
        claimNumber: { type: "string", nullable: true },
        memberID: { type: "string", nullable: true },
      },
      required: [
        "provider", "insurer", "billedAmount", "insurerPaid",
        "patientResponsibility", "denialReason", "cptCodes",
        "serviceDate", "claimNumber", "memberID",
      ],
    },
    detectedIssues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "BILL_EOB_MISMATCH", "OVERCHARGE", "DENIAL_FLAG",
              "NO_SURPRISES_ACT_TRIGGER", "DUPLICATE_CHARGE",
              "UPCODING", "BALANCE_BILLING",
            ],
          },
          severity: { type: "string", enum: ["warning", "error"] },
          description: { type: "string" },
        },
        required: ["type", "severity", "description"],
      },
    },
    explanation: { type: "string" },
    recommendedActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["contact_provider", "file_appeal", "legal_protection", "dispute_self_pay"],
          },
          action: { type: "string" },
        },
        required: ["category", "action"],
      },
    },
  },
  required: ["extractedFields", "detectedIssues", "explanation", "recommendedActions"],
}

const SYSTEM_PROMPT = `You are an expert medical billing advocate with deep knowledge of:
- CPT/ICD coding standards and common upcoding patterns
- EOB (Explanation of Benefits) interpretation
- The No Surprises Act (NSA) and balance billing protections
- CMS billing guidelines and Medicare/Medicaid rules
- Common overcharge and duplicate billing patterns

Analyze the provided medical bill or EOB document and return a structured analysis.
Be specific and actionable. If information is missing from the document, use null.
For monetary amounts, return numeric values only (no currency symbols).
For CPT codes, extract all procedure codes you can identify.

Issue detection guidelines:
- BILL_EOB_MISMATCH: patient responsibility on bill differs from EOB
- OVERCHARGE: billed amount significantly exceeds typical rates for the procedure
- DENIAL_FLAG: claim was denied and reason may be disputable
- NO_SURPRISES_ACT_TRIGGER: out-of-network charges at in-network facility or emergency care
- DUPLICATE_CHARGE: same CPT code or service billed multiple times
- UPCODING: CPT code appears more complex than the described service
- BALANCE_BILLING: provider billing difference between billed and insurer-allowed amount`

export async function analyzeDocument(input: AnalyzeInput): Promise<AnalysisResult> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: SYSTEM_PROMPT },
  ]

  if (input.text) {
    parts.push({ text: `\n\nDOCUMENT TEXT:\n${input.text}` })
  } else if (input.images && input.images.length > 0) {
    // Rendered PDF pages — send each as a PNG image
    for (const pageBase64 of input.images) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: pageBase64,
        },
      })
    }
    parts.push({ text: "\n\nAnalyze the medical document shown in the images above." })
  } else if (input.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: input.mimeType,
        data: input.imageBase64,
      },
    })
    parts.push({ text: "\n\nAnalyze the medical document shown in the image above." })
  } else {
    throw new Error("Either text, images, or imageBase64 must be provided")
  }

  // Future RAG hook: inject top-k similar past cases here before the generate call
  // const ragContext = await injectRAGContext(input.text ?? "")
  // if (ragContext) parts.splice(1, 0, { text: ragContext })

  const response = await getAI().models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.1, // Low temperature for consistent structured extraction
    },
  })

  const raw = response.text
  if (!raw) throw new Error("Empty response from Gemini")

  let parsed: {
    extractedFields: ExtractedFields
    detectedIssues: DetectedIssue[]
    explanation: string
    recommendedActions: RecommendedAction[]
  }

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${raw.slice(0, 200)}`)
  }

  return {
    caseId: uuidv4(),
    analyzedAt: new Date().toISOString(),
    ...parsed,
  }
}
