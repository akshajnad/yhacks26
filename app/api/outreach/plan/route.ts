import { NextRequest, NextResponse } from "next/server"
import { planOutreach } from "@/lib/agents/outreach-planner"
import type { AnalysisResult } from "@/types/analysis"

export async function POST(req: NextRequest) {
  let body: { analysis?: AnalysisResult }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.analysis) {
    return NextResponse.json({ error: "Missing required field: analysis" }, { status: 400 })
  }

  try {
    const brief = await planOutreach({ analysis: body.analysis })
    return NextResponse.json(brief)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[/api/outreach/plan] Error:", message)
    return NextResponse.json({ error: "Outreach planning failed", detail: message }, { status: 500 })
  }
}
