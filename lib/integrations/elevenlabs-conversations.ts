/**
 * ElevenLabs ConvAI — fetch conversation list/detail for post-call transcript & summaries.
 * Docs: GET /v1/convai/conversations, GET /v1/convai/conversations/{id}
 */

const CONV_BASE = "https://api.elevenlabs.io/v1/convai/conversations"

export interface ConversationListItem {
  conversation_id: string
  agent_id: string
  start_time_unix_secs: number
  call_duration_secs: number
  status: string
  transcript_summary?: string
  call_summary_title?: string
  conversation_initiation_source?: string
  direction?: string
}

interface ListResponse {
  conversations?: ConversationListItem[]
  has_more?: boolean
  next_cursor?: string
}

function headers(apiKey: string): HeadersInit {
  return {
    "xi-api-key": apiKey,
    accept: "application/json",
  }
}

/** Matches outbound `user_id` in call route: `medbill-${caseId.slice(0, 8)}`. */
export function medbillUserIdFromCaseId(caseId: string): string {
  return `medbill-${caseId.slice(0, 8)}`
}

export async function listConvaiConversations(
  apiKey: string,
  params: {
    agentId: string
    callStartAfterUnix?: number
    pageSize?: number
    summaryMode?: "include" | "exclude"
    conversationInitiationSource?: string
    /** ElevenLabs filters conversations by this (same as outbound `user_id`). */
    userId?: string
  }
): Promise<ListResponse> {
  const q = new URLSearchParams()
  q.set("agent_id", params.agentId)
  if (params.callStartAfterUnix != null) {
    q.set("call_start_after_unix", String(params.callStartAfterUnix))
  }
  q.set("page_size", String(params.pageSize ?? 15))
  q.set("summary_mode", params.summaryMode ?? "include")
  if (params.conversationInitiationSource) {
    q.set("conversation_initiation_source", params.conversationInitiationSource)
  }
  if (params.userId?.trim()) {
    q.set("user_id", params.userId.trim())
  }

  const res = await fetch(`${CONV_BASE}?${q.toString()}`, {
    method: "GET",
    headers: headers(apiKey),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`ElevenLabs list conversations HTTP ${res.status}: ${text.slice(0, 400)}`)
  }
  return JSON.parse(text) as ListResponse
}

/** Full conversation detail including transcript array and analysis.transcript_summary. */
export async function getConvaiConversation(
  apiKey: string,
  conversationId: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${CONV_BASE}/${encodeURIComponent(conversationId)}`, {
    method: "GET",
    headers: headers(apiKey),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`ElevenLabs get conversation HTTP ${res.status}: ${text.slice(0, 400)}`)
  }
  return JSON.parse(text) as Record<string, unknown>
}

export function transcriptArrayToText(transcript: unknown): string {
  if (!Array.isArray(transcript)) return ""
  const lines: string[] = []
  for (const turn of transcript) {
    if (!turn || typeof turn !== "object") continue
    const t = turn as Record<string, unknown>
    const role = typeof t.role === "string" ? t.role : "turn"
    const msg =
      typeof t.message === "string"
        ? t.message
        : typeof t.original_message === "string"
          ? t.original_message
          : ""
    if (msg.trim()) lines.push(`[${role}] ${msg.trim()}`)
  }
  return lines.join("\n")
}

export function extractAnalysisSummary(detail: Record<string, unknown>): {
  transcriptSummary: string | null
  callSummaryTitle: string | null
} {
  const analysis = detail.analysis
  if (!analysis || typeof analysis !== "object") {
    return { transcriptSummary: null, callSummaryTitle: null }
  }
  const a = analysis as Record<string, unknown>
  const ts = a.transcript_summary
  const ct = a.call_summary_title
  return {
    transcriptSummary: typeof ts === "string" && ts.trim() ? ts.trim() : null,
    callSummaryTitle: typeof ct === "string" && ct.trim() ? ct.trim() : null,
  }
}

/** True while ElevenLabs is still processing the conversation / summary. */
export function isConversationStillProcessing(detail: Record<string, unknown>): boolean {
  const status = String(detail.status ?? "").toLowerCase()
  return (
    status === "initiated" ||
    status === "in-progress" ||
    status === "processing" ||
    status === "in_progress"
  )
}

/**
 * Pick the best conversation after an outbound call: newest Twilio/outbound match with summary or done status.
 */
export function pickConversationAfterCall(
  items: ConversationListItem[],
  callStartedAtUnix: number
): ConversationListItem | null {
  const buffer = 400
  const minT = callStartedAtUnix - buffer
  const filtered = items.filter((c) => {
    if (c.start_time_unix_secs < minT) return false
    const src = (c.conversation_initiation_source ?? "").toLowerCase()
    const dir = (c.direction ?? "").toLowerCase()
    if (src === "twilio" || dir === "outbound") return true
    return true
  })
  filtered.sort((a, b) => b.start_time_unix_secs - a.start_time_unix_secs)
  return filtered[0] ?? null
}

/** Prefer exact conversation id from outbound, else newest row after call time, else newest in list. */
export function pickConversationForCase(
  items: ConversationListItem[],
  opts: { preferredConversationId?: string | null; callStartedAtUnix: number }
): ConversationListItem | null {
  if (items.length === 0) return null
  const pref = opts.preferredConversationId?.trim()
  if (pref) {
    const hit = items.find((c) => c.conversation_id === pref)
    if (hit) return hit
  }
  const byTime = pickConversationAfterCall(items, opts.callStartedAtUnix)
  if (byTime) return byTime
  const sorted = [...items].sort((a, b) => b.start_time_unix_secs - a.start_time_unix_secs)
  return sorted[0] ?? null
}

/** Newest conversation for this user (e.g. refresh / “any new call?”). */
export function pickNewestConversation(
  items: ConversationListItem[]
): ConversationListItem | null {
  if (items.length === 0) return null
  const sorted = [...items].sort((a, b) => b.start_time_unix_secs - a.start_time_unix_secs)
  return sorted[0] ?? null
}

export function extractConversationIdFromOutboundResponse(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const o = data as Record<string, unknown>
  const direct = o.conversation_id ?? o.conversationId
  if (typeof direct === "string" && direct.length > 0) return direct
  const inner = o.data ?? o.call
  if (inner && typeof inner === "object") {
    const n = inner as Record<string, unknown>
    const id = n.conversation_id ?? n.conversationId
    if (typeof id === "string" && id.length > 0) return id
  }
  return null
}
