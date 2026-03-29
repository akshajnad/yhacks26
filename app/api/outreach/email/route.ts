import { NextRequest, NextResponse } from "next/server"
import { draftEmail } from "@/lib/agents/email-drafter"
import type { EmailDraftRequest } from "@/types/outreach"

export async function POST(req: NextRequest) {
  let body: Partial<EmailDraftRequest>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.outreachBrief || !body.targetId || !body.draftType) {
    return NextResponse.json(
      { error: "Missing required fields: outreachBrief, targetId, draftType" },
      { status: 400 }
    )
  }

  if (!process.env.LAVA_SECRET_KEY) {
    return NextResponse.json(
      { error: "LAVA_SECRET_KEY is not configured. Email drafting requires Lava/OpenAI." },
      { status: 503 }
    )
  }

  try {
    const draft = await draftEmail(body as EmailDraftRequest)
    return NextResponse.json(draft)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[/api/outreach/email] Error:", message)
    return NextResponse.json({ error: "Email draft generation failed", detail: message }, { status: 500 })
  }
}
