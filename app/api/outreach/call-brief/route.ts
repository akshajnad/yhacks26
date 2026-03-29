import { NextRequest, NextResponse } from "next/server"
import { generateCallBrief } from "@/lib/agents/call-brief"
import type { CallBriefRequest } from "@/types/outreach"

export async function POST(req: NextRequest) {
  let body: Partial<CallBriefRequest>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.outreachBrief || !body.targetId) {
    return NextResponse.json(
      { error: "Missing required fields: outreachBrief, targetId" },
      { status: 400 }
    )
  }

  if (!process.env.LAVA_SECRET_KEY) {
    return NextResponse.json(
      { error: "LAVA_SECRET_KEY is not configured. Call brief generation requires Lava/OpenAI." },
      { status: 503 }
    )
  }

  try {
    const brief = await generateCallBrief(body as CallBriefRequest)
    return NextResponse.json(brief)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[/api/outreach/call-brief] Error:", message)
    return NextResponse.json({ error: "Call brief generation failed", detail: message }, { status: 500 })
  }
}
