import { NextRequest, NextResponse } from "next/server"
import { buildElevenLabsPayload } from "@/lib/integrations/elevenlabs"
import type { OutreachBrief, CallBriefResponse } from "@/types/outreach"

export async function POST(req: NextRequest) {
  let body: { outreachBrief?: OutreachBrief; callBrief?: CallBriefResponse; targetId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.outreachBrief || !body.callBrief || !body.targetId) {
    return NextResponse.json(
      { error: "Missing required fields: outreachBrief, callBrief, targetId" },
      { status: 400 }
    )
  }

  const target = body.outreachBrief.contactTargets.find((t) => t.id === body.targetId)
  if (!target) {
    return NextResponse.json(
      { error: `Contact target not found: ${body.targetId}` },
      { status: 400 }
    )
  }

  try {
    const payload = buildElevenLabsPayload({
      outreachBrief: body.outreachBrief,
      callBrief: body.callBrief,
      target,
    })
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[/api/outreach/elevenlabs] Error:", message)
    return NextResponse.json({ error: "ElevenLabs payload generation failed", detail: message }, { status: 500 })
  }
}
