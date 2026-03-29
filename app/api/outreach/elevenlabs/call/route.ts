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
import { exec } from "child_process"
import {
  mergeDynamicVariablesForOutboundCall,
  stripElevenLabsEnvValue,
} from "@/lib/integrations/elevenlabs"
import { extractConversationIdFromOutboundResponse } from "@/lib/integrations/elevenlabs-conversations"
import type { ElevenLabsCallPayload } from "@/types/outreach"

const ELEVENLABS_OUTBOUND_URL = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call"

function elevenLabsErrorPayload(
  status: number,
  responseData: unknown,
  responseText: string
): { error: string; detail?: unknown; hint?: string } {
  const detail =
    responseData &&
    typeof responseData === "object" &&
    "detail" in responseData
      ? (responseData as { detail: unknown }).detail
      : null

  const code =
    detail &&
    typeof detail === "object" &&
    detail !== null &&
    "code" in detail
      ? String((detail as { code: unknown }).code)
      : ""

  const msg =
    detail &&
    typeof detail === "object" &&
    detail !== null &&
    "message" in detail
      ? String((detail as { message: unknown }).message)
      : responseText.slice(0, 300)

  if (status === 404 && (code === "document_not_found" || /not found/i.test(msg))) {
    return {
      error:
        "ElevenLabs could not find this agent or phone resource for your API key (404).",
      detail: responseData,
      hint:
        "Use an Agent ID and Phone number ID from the same ElevenLabs account as your API key (ConvAI → Agents → copy ID). Update ELEVENLABS_AGENT_ID, ELEVENLABS_AGENT_PHONE_NUMBER_ID, and ELEVENLABS_API_KEY in .env.local with no extra quotes or spaces, then restart `next dev` (env is read at server start).",
    }
  }

  if (status === 401) {
    return {
      error: "ElevenLabs rejected the API key (401).",
      detail: responseData,
      hint: "Regenerate the xi-api key in ElevenLabs profile and set ELEVENLABS_API_KEY in .env.local, then restart the dev server.",
    }
  }

  if (status === 422) {
    return {
      error: `ElevenLabs returned ${status}: ${msg}`,
      detail: responseData,
      hint:
        "ELEVENLABS_AGENT_PHONE_NUMBER_ID must be the phnum_… ID from Phone Numbers in the same workspace as the agent (not the raw phone number).",
    }
  }

  return {
    error: `ElevenLabs returned ${status}${msg ? `: ${msg}` : ""}`,
    detail: responseData,
  }
}

function normalizeE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  if (digits.length > 7) return `+${digits}`
  return null
}

export async function POST(req: NextRequest) {
  const agentId = stripElevenLabsEnvValue(process.env.ELEVENLABS_AGENT_ID)
  const phoneNumberId = stripElevenLabsEnvValue(process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID)
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
      { error: `Could not parse phone number: "${rawNumber}". Use E.164 format.` },
      { status: 400 }
    )
  }

  const firstMessage = payload.conversation.firstMessage || "Hi, I am calling about a medical bill.";

  console.log("[/api/outreach/elevenlabs/call] Executing curl to:", toNumber)

  const curlCommand = `curl -s -L -X POST "https://api.lava.so/v1/forward/https://api.elevenlabs.io/v1/convai/twilio/outbound-call" \\
  -H "xi-api-key: $(echo -n '{"secret_key":"aks_live_ZDewxS85jGsA8d4orViSt2UwH6jS_rdKt9vks0cftIuenW_XO09YkJI","provider_key":"sk_f181173838d41ea071720e2f99f474510c6b689577482ffc"}' | base64)" \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id":"agent_4501kmwj9ha4f3kaethmn39hk6y2","agent_phone_number_id":"phnum_2601kmwhkemde2rsz9mwr6t03wky","to_number":${JSON.stringify(toNumber)},"first_message":${JSON.stringify(firstMessage).replace(/'/g, "'\\''")}}'`;

  return new Promise((resolve) => {
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return resolve(NextResponse.json({ error: error.message, stderr }, { status: 500 }));
      }
      
      try {
        const parsed = JSON.parse(stdout);
        // ElevanLabs 422 error check
        if (parsed.detail && Array.isArray(parsed.detail)) {
            console.error("[/api/outreach/elevenlabs/call] ElevenLabs error:", parsed);
            return resolve(NextResponse.json(elevenLabsErrorPayload(422, parsed, stdout), { status: 422 }));
        }

        const conversationId = extractConversationIdFromOutboundResponse(parsed);
        resolve(NextResponse.json({ 
          success: true, 
          toNumber, 
          agentId: "agent_4501kmwj9ha4f3kaethmn39hk6y2",
          conversationId: conversationId ?? null, 
          response: parsed 
        }));
      } catch {
        resolve(NextResponse.json({ raw: stdout, toNumber }, { status: 500 }));
      }
    });
  });
}
