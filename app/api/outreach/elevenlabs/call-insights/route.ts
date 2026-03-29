/**
 * POST /api/outreach/elevenlabs/call-insights
 *
 * Resolves ElevenLabs transcript summary (same source as the EL dashboard) + GPT next steps.
 *
 * Body:
 * - `analysis` (required): full AnalysisResult for case context + caseId → medbill user id.
 * - `refresh: true`: list conversations by medbill user_id only (no narrow time window), pick **newest**,
 *   then fetch summary — use from Analysis workspace “Refresh call insights”.
 * - Otherwise: post-call flow using callStartedAtUnix, optional conversationId / outboundResponse.
 */

import { NextRequest, NextResponse } from "next/server"
import { generateCallFollowUpGuidance } from "@/lib/agents/call-followup-guidance"
import {
  type ConversationListItem,
  extractAnalysisSummary,
  extractConversationIdFromOutboundResponse,
  getConvaiConversation,
  isConversationStillProcessing,
  listConvaiConversations,
  medbillUserIdFromCaseId,
  pickConversationForCase,
  pickNewestConversation,
  transcriptArrayToText,
} from "@/lib/integrations/elevenlabs-conversations"
import type { AnalysisResult, ElevenLabsCallInsights } from "@/types/analysis"

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const agentId = process.env.ELEVENLABS_AGENT_ID

  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not set." },
      { status: 503 }
    )
  }
  if (!agentId) {
    return NextResponse.json({ error: "ELEVENLABS_AGENT_ID is not set." }, { status: 503 })
  }

  let body: {
    analysis?: AnalysisResult
    refresh?: boolean
    callStartedAtUnix?: number
    conversationId?: string | null
    outboundResponse?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const analysis = body.analysis
  if (!analysis?.caseId) {
    return NextResponse.json({ error: "Missing analysis.caseId" }, { status: 400 })
  }

  const medbillUserId = medbillUserIdFromCaseId(analysis.caseId)
  const isRefresh = body.refresh === true

  try {
    if (isRefresh) {
      return await handleRefreshMode(apiKey, agentId, medbillUserId, analysis)
    }

    return await handlePostCallMode(apiKey, agentId, medbillUserId, analysis, body)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[call-insights]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function handleRefreshMode(
  apiKey: string,
  agentId: string,
  medbillUserId: string,
  analysis: AnalysisResult
) {
  const listByUser = await listConvaiConversations(apiKey, {
    agentId,
    userId: medbillUserId,
    pageSize: 50,
    summaryMode: "include",
  })

  const items = (listByUser.conversations ?? []) as ConversationListItem[]
  if (items.length === 0) {
    return NextResponse.json(
      {
        error:
          "No ElevenLabs conversations found for this case’s MedBill user id yet. Place a call from the Call action first.",
      },
      { status: 404 }
    )
  }

  const picked = pickNewestConversation(items)
  if (!picked?.conversation_id) {
    return NextResponse.json({ error: "Could not resolve a conversation." }, { status: 404 })
  }

  const previousId = analysis.elevenLabsCallInsights?.conversationId ?? null
  const isNewConversation =
    previousId != null && previousId !== picked.conversation_id

  let transcriptSummary =
    (picked.transcript_summary && picked.transcript_summary.trim()) || null
  let callSummaryTitle = picked.call_summary_title?.trim() ?? null
  let transcriptText = ""
  const resolvedConversationId = picked.conversation_id

  if (!transcriptSummary?.trim()) {
    try {
      const detail = await getConvaiConversation(apiKey, resolvedConversationId)
      if (!isConversationStillProcessing(detail)) {
        const fromAnalysis = extractAnalysisSummary(detail)
        transcriptSummary = fromAnalysis.transcriptSummary
        callSummaryTitle = callSummaryTitle ?? fromAnalysis.callSummaryTitle
        transcriptText = transcriptArrayToText(detail.transcript)
        if (!transcriptSummary?.trim() && transcriptText.trim()) {
          transcriptSummary = transcriptText.slice(0, 12000)
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (!transcriptSummary?.trim()) {
    return NextResponse.json(
      {
        error:
          "Transcript summary not ready yet for the latest conversation. Retry shortly.",
        retryable: true,
      },
      { status: 404 }
    )
  }

  const guidance = await generateCallFollowUpGuidance({
    transcriptSummary,
    callSummaryTitle,
    analysis,
  })

  const insights: ElevenLabsCallInsights = {
    conversationId: resolvedConversationId,
    transcriptSummary,
    callSummaryTitle,
    transcriptText: transcriptText.trim() || undefined,
    nextStepsGuidance: guidance.nextStepsGuidance,
    patientImpactSummary: guidance.patientImpactSummary,
    escalationNotes: guidance.escalationNotes,
    fetchedAt: new Date().toISOString(),
  }

  return NextResponse.json({ insights, isNewConversation, medbillUserId })
}

async function handlePostCallMode(
  apiKey: string,
  agentId: string,
  medbillUserId: string,
  analysis: AnalysisResult,
  body: {
    callStartedAtUnix?: number
    conversationId?: string | null
    outboundResponse?: unknown
  }
) {
  const preferredConversationId =
    (typeof body.conversationId === "string" && body.conversationId.trim()) ||
    extractConversationIdFromOutboundResponse(body.outboundResponse)

  const callStartedAtUnix =
    typeof body.callStartedAtUnix === "number" && body.callStartedAtUnix > 0
      ? body.callStartedAtUnix
      : Math.floor(Date.now() / 1000)

  let transcriptSummary: string | null = null
  let callSummaryTitle: string | null = null
  let transcriptText = ""
  let resolvedConversationId: string | null = null

  // --- A) Direct GET when we already know conv id (may be processing — then list by user_id) ---
  if (preferredConversationId) {
    try {
      const detail = await getConvaiConversation(apiKey, preferredConversationId)
      if (!isConversationStillProcessing(detail)) {
        const fromAnalysis = extractAnalysisSummary(detail)
        transcriptSummary = fromAnalysis.transcriptSummary
        callSummaryTitle = fromAnalysis.callSummaryTitle
        transcriptText = transcriptArrayToText(detail.transcript)
        if (!transcriptSummary?.trim() && transcriptText.trim()) {
          transcriptSummary = transcriptText.slice(0, 12000)
        }
        if (transcriptSummary?.trim()) {
          resolvedConversationId = preferredConversationId
        }
      }
    } catch {
      // GET failed — resolve via list + user_id below
    }
  }

  // --- B) LIST by medbill user_id (matches dashboard + Twilio outbound) ---
  if (!transcriptSummary?.trim()) {
    const listByUser = await listConvaiConversations(apiKey, {
      agentId,
      userId: medbillUserId,
      callStartAfterUnix: callStartedAtUnix - 900,
      pageSize: 30,
      summaryMode: "include",
    })

    const items = (listByUser.conversations ?? []) as ConversationListItem[]
    const picked = pickConversationForCase(items, {
      preferredConversationId,
      callStartedAtUnix,
    })

    if (picked?.conversation_id) {
      resolvedConversationId = picked.conversation_id
      transcriptSummary =
        (picked.transcript_summary && picked.transcript_summary.trim()) || null
      callSummaryTitle = picked.call_summary_title?.trim() ?? null
    }

    if (resolvedConversationId && !transcriptSummary?.trim()) {
      try {
        const detail = await getConvaiConversation(apiKey, resolvedConversationId)
        if (!isConversationStillProcessing(detail)) {
          const fromAnalysis = extractAnalysisSummary(detail)
          transcriptSummary = fromAnalysis.transcriptSummary
          callSummaryTitle = callSummaryTitle ?? fromAnalysis.callSummaryTitle
          transcriptText = transcriptArrayToText(detail.transcript)
          if (!transcriptSummary?.trim() && transcriptText.trim()) {
            transcriptSummary = transcriptText.slice(0, 12000)
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  // --- C) Fallback: time window + optional Twilio source (no user filter) ---
  if (!transcriptSummary?.trim() && !resolvedConversationId) {
    const listFallback = await listConvaiConversations(apiKey, {
      agentId,
      callStartAfterUnix: callStartedAtUnix - 900,
      pageSize: 30,
      summaryMode: "include",
      conversationInitiationSource: "twilio",
    })
    const items = (listFallback.conversations ?? []) as ConversationListItem[]
    const picked = pickConversationForCase(items, {
      preferredConversationId,
      callStartedAtUnix,
    })
    if (picked?.conversation_id) {
      resolvedConversationId = picked.conversation_id
      transcriptSummary =
        (picked.transcript_summary && picked.transcript_summary.trim()) || null
      callSummaryTitle = picked.call_summary_title?.trim() ?? null
    }
  }

  if (!resolvedConversationId || !transcriptSummary?.trim()) {
    console.log(
      "[call-insights] not ready yet — user_id=%s preferredConv=%s",
      medbillUserId,
      preferredConversationId ?? "none"
    )
    return NextResponse.json(
      {
        error:
          "Transcript summary not ready yet (ElevenLabs may still be processing). Retry in a few seconds.",
        retryable: true,
      },
      { status: 404 }
    )
  }

  const guidance = await generateCallFollowUpGuidance({
    transcriptSummary,
    callSummaryTitle,
    analysis,
  })

  const insights: ElevenLabsCallInsights = {
    conversationId: resolvedConversationId,
    transcriptSummary,
    callSummaryTitle,
    transcriptText: transcriptText.trim() || undefined,
    nextStepsGuidance: guidance.nextStepsGuidance,
    patientImpactSummary: guidance.patientImpactSummary,
    escalationNotes: guidance.escalationNotes,
    fetchedAt: new Date().toISOString(),
  }

  return NextResponse.json({ insights })
}
