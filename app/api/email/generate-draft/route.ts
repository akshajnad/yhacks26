import { NextRequest, NextResponse } from "next/server"
import type { AnalysisResult } from "@/types/analysis"
import { analyze } from "@/lib/ai/transport"
import { getFallbackDraft } from "@/lib/email"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { analysisResult?: AnalysisResult }
    const analysisResult = body.analysisResult

    if (!analysisResult) {
      return NextResponse.json({ error: "analysisResult is required" }, { status: 400 })
    }

    const prompt = `You generate a single, professional medical billing dispute email JSON draft.

Rules for recipient selection:
- provider-side issues (billing / duplicate / upcoding / provider mismatch) => provider
- insurer-side issues (denial / coverage / EOB processing issue) => insurer
- mixed issues => choose the single best recipient for now, and explain in the body that additional follow-up may be needed

Use these extracted details when available:
- providerEmail, insurerEmail, providerPhone, insurerPhone
- issue types and descriptions
- service date
- claim number
- member ID
- billed amount / insurer paid / patient responsibility
- recommended actions

Output must be STRICT JSON ONLY:
{
  "recipientType": "provider" | "insurer",
  "to": "email@example.com",
  "subject": "string",
  "body": "string"
}

Avoid markdown. Keep tone factual/professional. Include references to IDs/dates if available.

ANALYSIS JSON:
${JSON.stringify(analysisResult)}`

    const raw = await analyze(
      [
        {
          role: "system",
          content: "You are a healthcare billing dispute communication specialist. Return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      0.1
    )

    const parsed = JSON.parse(raw) as {
      recipientType?: "provider" | "insurer"
      to?: string
      subject?: string
      body?: string
    }

    if (!parsed.recipientType || !parsed.subject || !parsed.body) {
      throw new Error("Model output missing required fields")
    }

    const fallback = getFallbackDraft(analysisResult)
    return NextResponse.json({
      recipientType: parsed.recipientType,
      to: parsed.to?.trim() || fallback.to,
      subject: parsed.subject.trim(),
      body: parsed.body.trim(),
    })
  } catch (error) {
    console.error("[/api/email/generate-draft]", error)

    try {
      const body = (await req.clone().json()) as { analysisResult?: AnalysisResult }
      if (body.analysisResult) {
        return NextResponse.json(getFallbackDraft(body.analysisResult))
      }
    } catch {
      // no-op
    }

    const message = error instanceof Error ? error.message : "Draft generation failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
