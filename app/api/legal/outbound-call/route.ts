/**
 * POST /api/legal/outbound-call
 *
 * ElevenLabs ConvAI Twilio outbound — matches the public API shape (see ElevenLabs docs).
 * This endpoint is not supported via Lava forward; use ELEVENLABS_API_KEY server-side only.
 *
 * @see https://api.elevenlabs.io/v1/convai/twilio/outbound-call
 */

import { NextRequest, NextResponse } from "next/server";
import {
  buildConvaiLegalConversation,
  type LegalCallScriptMeta,
} from "@/lib/agents/legalCallScript";

const ELEVENLABS_OUTBOUND_URL =
  "https://api.elevenlabs.io/v1/convai/twilio/outbound-call";

/** Accept US 10-digit, +1…, or other E.164; ElevenLabs/Twilio accept E.164. */
function normalizeToNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (process.env.LEGAL_OUTBOUND_CALLS_ENABLED === "false") {
    return NextResponse.json(
      { error: "Outbound demo calls are disabled (LEGAL_OUTBOUND_CALLS_ENABLED=false)." },
      { status: 403 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const agentId = process.env.ELEVENLABS_AGENT_ID?.trim();
  const phoneNumberId = process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID?.trim();

  if (!apiKey || !agentId || !phoneNumberId) {
    return NextResponse.json(
      {
        error:
          "Server missing ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, or ELEVENLABS_AGENT_PHONE_NUMBER_ID. Add them to .env.local.",
      },
      { status: 503 },
    );
  }

  let body: {
    toNumber?: string;
    legalReport?: string;
    city?: string;
    state?: string;
    issue?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const toNumber = normalizeToNumber(body.toNumber ?? "");
  if (!toNumber) {
    return NextResponse.json(
      {
        error:
          "Invalid phone number. Use 10-digit US, or E.164 (e.g. +18605938988).",
      },
      { status: 400 },
    );
  }

  const legalReport = body.legalReport?.trim();
  if (!legalReport || legalReport.length < 50) {
    return NextResponse.json(
      { error: "legalReport is required (at least 50 characters) — run research first." },
      { status: 400 },
    );
  }

  const meta: LegalCallScriptMeta = {
    city: body.city?.trim() || "Unknown",
    state: body.state?.trim() || "",
    issue: body.issue?.trim() || "Medical billing dispute",
  };

  const conv = buildConvaiLegalConversation(legalReport, meta);

  /**
   * Body aligned with ElevenLabs sample / OpenAPI: empty nested objects are OK.
   * `agent.first_message` drives the opening; `dynamic_variables` feeds agent templates ({{issue_summary}}, etc.).
   */
  const payload = {
    agent_id: agentId,
    agent_phone_number_id: phoneNumberId,
    to_number: toNumber,
    conversation_initiation_client_data: {
      conversation_config_override: {
        turn: {},
        tts: {},
        conversation: {},
        agent: {
          first_message: conv.firstMessage,
        },
      },
      custom_llm_extra_body: {} as Record<string, unknown>,
      user_id: "medbill-legal",
      source_info: {} as Record<string, unknown>,
      branch_id: "",
      environment: "",
      dynamic_variables: conv.dynamicVariables,
    },
    call_recording_enabled: false,
    telephony_call_config: {} as Record<string, unknown>,
  };

  let upstream: Response;
  try {
    upstream = await fetch(ELEVENLABS_OUTBOUND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return NextResponse.json({ error: `ElevenLabs request failed: ${msg}` }, { status: 502 });
  }

  const text = await upstream.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!upstream.ok) {
    const detailStr =
      typeof data === "object" && data !== null && "detail" in data
        ? JSON.stringify((data as { detail: unknown }).detail)
        : JSON.stringify(data);
    console.error("[outbound-call] ElevenLabs error:", upstream.status, detailStr);

    return NextResponse.json(
      {
        error: `ElevenLabs upstream error (${upstream.status})`,
        hint:
          upstream.status === 400
            ? "Verify ELEVENLABS_API_KEY, agent_id, agent_phone_number_id, and Twilio linkage in ElevenLabs."
            : undefined,
        detail: data,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    toNumber,
    message:
      "Outbound call requested. The agent receives first_message plus dynamic_variables (issue_summary, legal_excerpt, next_steps, etc.).",
    upstream: data,
    previews: {
      nextSteps: conv.nextSteps,
      issueSummary: conv.issueSummary,
      firstMessageChars: conv.firstMessage.length,
    },
  });
}
