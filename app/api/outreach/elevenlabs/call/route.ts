/**
 * POST /api/outreach/elevenlabs/call
 *
 * Fires an actual ElevenLabs outbound call using the Twilio integration.
 * Requires ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, and ELEVENLABS_AGENT_PHONE_NUMBER_ID.
 * The to_number comes from the payload's recipient.toNumber field.
 *
 * Many agents forbid API overrides for `first_message` and `prompt`. Default behavior:
 * send NO agent overrides — only `dynamic_variables` (opening_script, first_message, system_prompt).
 * Configure the ConvAI agent in ElevenLabs to use {{opening_script}} and {{system_prompt}}.
 *
 * Opt-in: ELEVENLABS_ALLOW_*_OVERRIDE=true only if your agent explicitly allows those overrides.
 */

import { NextRequest, NextResponse } from "next/server"
import { mergeDynamicVariablesForOutboundCall } from "@/lib/integrations/elevenlabs"
import { extractConversationIdFromOutboundResponse } from "@/lib/integrations/elevenlabs-conversations"
import type { ElevenLabsCallPayload } from "@/types/outreach"

const ELEVENLABS_OUTBOUND_URL = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call"

function normalizeE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  if (digits.length > 7) return `+${digits}`
  return null
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const agentId = process.env.ELEVENLABS_AGENT_ID
  const phoneNumberId = process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID

  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not set. Add it to your .env.local file." },
      { status: 503 }
    )
  }
  if (!agentId) {
    return NextResponse.json(
      { error: "ELEVENLABS_AGENT_ID is not set. Add it to your .env.local file." },
      { status: 503 }
    )
  }
  if (!phoneNumberId) {
    return NextResponse.json(
      { error: "ELEVENLABS_AGENT_PHONE_NUMBER_ID is not set. Add it to your .env.local file." },
      { status: 503 }
    )
  }

  let body: { payload?: ElevenLabsCallPayload }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const payload = body.payload
  if (!payload) {
    return NextResponse.json({ error: "Missing required field: payload" }, { status: 400 })
  }

  const rawNumber = payload.recipient.toNumber
  if (!rawNumber) {
    return NextResponse.json(
      { error: "No phone number on the contact target. Enter a phone number in the Outreach Plan tab first." },
      { status: 400 }
    )
  }

  const toNumber = normalizeE164(rawNumber)
  if (!toNumber) {
    return NextResponse.json(
      { error: `Could not parse phone number: "${rawNumber}". Use E.164 format like +15551234567.` },
      { status: 400 }
    )
  }

  // Default: NO agent field overrides — locked agents reject first_message / prompt from API.
  // Opt-in only when the workspace explicitly allows overrides.
  const allowFirstMessageOverride =
    process.env.ELEVENLABS_ALLOW_FIRST_MESSAGE_OVERRIDE === "true" ||
    process.env.ELEVENLABS_ALLOW_FIRST_MESSAGE_OVERRIDE === "1"

  const allowPromptOverride =
    process.env.ELEVENLABS_ALLOW_PROMPT_OVERRIDE === "true" ||
    process.env.ELEVENLABS_ALLOW_PROMPT_OVERRIDE === "1"

  const agentOverride: Record<string, unknown> = {}
  if (allowFirstMessageOverride) {
    agentOverride.first_message = payload.conversation.firstMessage
  }
  if (allowPromptOverride) {
    agentOverride.prompt = { prompt: payload.conversation.systemPrompt }
  }

  // Runtime text + merged reference IDs (see lib/integrations/elevenlabs.ts mergeReferenceData)
  const baseVars = mergeDynamicVariablesForOutboundCall(payload)

  // By default omit conversation_config_override entirely — "locked" agents reject even empty agent {}.
  // Include override block only when: (1) sending real API overrides, or (2) explicit opt-in for curl-compatible shell.
  const includeEmptyOverrideShell =
    process.env.ELEVENLABS_INCLUDE_EMPTY_CONVERSATION_OVERRIDE === "true" ||
    process.env.ELEVENLABS_INCLUDE_EMPTY_CONVERSATION_OVERRIDE === "1"

  const hasAgentApiOverrides = allowFirstMessageOverride || allowPromptOverride

  const conversationInitiationClientData: Record<string, unknown> = {
    custom_llm_extra_body: {},
    user_id: `medbill-${payload.caseId.slice(0, 8)}`,
    source_info: {},
    branch_id: "",
    environment: "",
    dynamic_variables: baseVars,
  }

  if (hasAgentApiOverrides || includeEmptyOverrideShell) {
    conversationInitiationClientData.conversation_config_override = {
      turn: {},
      tts: {},
      conversation: {},
      agent: agentOverride,
    }
  }

  // Build the ElevenLabs request body.
  const elevenLabsBody = {
    agent_id: agentId,
    agent_phone_number_id: phoneNumberId,
    to_number: toNumber,
    conversation_initiation_client_data: conversationInitiationClientData,
    call_recording_enabled: false,
    telephony_call_config: {},
  }

  console.log("[/api/outreach/elevenlabs/call] Initiating call to:", toNumber)
  console.log("[/api/outreach/elevenlabs/call] Agent ID:", agentId)
  console.log("[/api/outreach/elevenlabs/call] first_message override:", allowFirstMessageOverride)
  console.log("[/api/outreach/elevenlabs/call] prompt override:", allowPromptOverride)
  console.log("[/api/outreach/elevenlabs/call] has conversation_config_override:", "conversation_config_override" in conversationInitiationClientData)
  console.log("[/api/outreach/elevenlabs/call] First message length:", payload.conversation.firstMessage?.length ?? 0)
  console.log(
    "[/api/outreach/elevenlabs/call] dynamic_variables keys:",
    Object.keys(baseVars).sort().join(", ")
  )

  let upstream: Response
  try {
    upstream = await fetch(ELEVENLABS_OUTBOUND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(elevenLabsBody),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[/api/outreach/elevenlabs/call] Network error:", message)
    return NextResponse.json(
      { error: "Network error reaching ElevenLabs API", detail: message },
      { status: 502 }
    )
  }

  const responseText = await upstream.text()
  let responseData: unknown
  try {
    responseData = JSON.parse(responseText)
  } catch {
    responseData = { raw: responseText }
  }

  if (!upstream.ok) {
    console.error("[/api/outreach/elevenlabs/call] ElevenLabs error:", upstream.status, responseText)
    return NextResponse.json(
      {
        error: `ElevenLabs returned ${upstream.status}`,
        detail: responseData,
        hint: upstream.status === 422
          ? "Check that ELEVENLABS_AGENT_PHONE_NUMBER_ID is a valid phnum_... ID (not a phone number)."
          : upstream.status === 401
          ? "Check that ELEVENLABS_API_KEY is correct."
          : undefined,
      },
      { status: upstream.status }
    )
  }

  console.log("[/api/outreach/elevenlabs/call] Call initiated successfully:", responseData)
  const conversationId = extractConversationIdFromOutboundResponse(responseData)
  return NextResponse.json({
    success: true,
    toNumber,
    agentId,
    conversationId: conversationId ?? null,
    response: responseData,
  })
}
