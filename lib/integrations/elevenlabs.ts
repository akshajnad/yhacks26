/**
 * ElevenLabs Provider Adapter
 *
 * Maps OutreachBrief + CallBriefResponse + ContactTarget into a normalized
 * ElevenLabsCallPayload. Does not perform analysis or draft generation.
 *
 * Returns mode: "conversation_config" when ELEVENLABS_API_KEY is present.
 * Returns mode: "preview" when credentials are absent — still a complete payload.
 *
 * Raw medical documents are never passed to ElevenLabs.
 */

import type { OutreachBrief, CallBriefResponse, ContactTarget, ElevenLabsCallPayload } from "@/types/outreach"

// ── System prompt template ────────────────────────────────────────────────────

function buildSystemPrompt(
  brief: OutreachBrief,
  callBrief: CallBriefResponse,
  target: ContactTarget
): string {
  const patientName = brief.patientContext.fullName ?? "the patient"
  const orgName = target.organizationName
  const dept = target.department

  const prohibitedSection =
    callBrief.prohibitedClaims.length > 0
      ? `\n\nYou MUST NOT say:\n${callBrief.prohibitedClaims.map((c) => `- ${c}`).join("\n")}`
      : ""

  const legalSection =
    callBrief.legalPoints.length > 0
      ? `\n\nApplicable regulations you may reference:\n${callBrief.legalPoints.map((p) => `- ${p}`).join("\n")}`
      : ""

  const escalationSection =
    callBrief.escalationPath.length > 0
      ? `\n\nIf the representative cannot resolve the issue:\n${callBrief.escalationPath.map((s) => `- ${s}`).join("\n")}`
      : ""

  return `You are a professional medical billing dispute assistant calling ${orgName}'s ${dept} department on behalf of ${patientName}, with the patient's explicit authorization.

Your role is to clearly and professionally communicate a billing dispute, request specific corrections, and document the outcome of the call.

COMMUNICATION STYLE:
- Firm, factual, and non-speculative
- Polite and cooperative — you are seeking resolution, not confrontation
- Do not make accusations; state discrepancies as factual observations
- Do not claim legal expertise or threaten litigation unless you have a specific cited regulation
- If asked about your nature, state that you are an AI assistant authorized by the patient

MUST COMMUNICATE:
${callBrief.mustSay.map((s) => `- ${s}`).join("\n")}

REQUESTED RESOLUTION:
${brief.requestedResolution.map((r) => `- ${r}`).join("\n")}${legalSection}${prohibitedSection}${escalationSection}

When the representative confirms an action or provides information, summarize it clearly and ask for a reference number or confirmation in writing if possible.`
}

// ── Dynamic variables ─────────────────────────────────────────────────────────

function buildDynamicVariables(
  brief: OutreachBrief,
  callBrief: CallBriefResponse,
  target: ContactTarget
): Record<string, string> {
  const ef = brief.analysis.extractedFields

  const vars: Record<string, string> = {
    patient_name: brief.patientContext.fullName ?? "",
    organization_name: target.organizationName,
    department: target.department,
    member_id: brief.patientContext.memberID ?? "",
    claim_number: brief.patientContext.claimNumber ?? "",
    account_number: brief.patientContext.accountNumber ?? "",
    service_date: brief.documentContext.serviceDate ?? "",
    billed_amount: ef.billedAmount != null ? String(ef.billedAmount) : "",
    patient_responsibility: ef.patientResponsibility != null ? String(ef.patientResponsibility) : "",
    insurer_paid: ef.insurerPaid != null ? String(ef.insurerPaid) : "",
    issue_summary: brief.analysis.detectedIssues
      .slice(0, 3)
      .map((i) => i.type.replace(/_/g, " ").toLowerCase())
      .join(", "),
    requested_resolution: brief.requestedResolution.slice(0, 2).join("; "),
    opening_script: callBrief.openingScript,
  }

  // Remove empty string values — ElevenLabs may reject empty dynamic variables
  return Object.fromEntries(Object.entries(vars).filter(([, v]) => v !== ""))
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildElevenLabsPayload(input: {
  outreachBrief: OutreachBrief
  callBrief: CallBriefResponse
  target: ContactTarget
}): ElevenLabsCallPayload {
  const { outreachBrief: brief, callBrief, target } = input

  const hasCredentials = Boolean(process.env.ELEVENLABS_API_KEY)
  const mode: ElevenLabsCallPayload["mode"] = hasCredentials ? "conversation_config" : "preview"

  const systemPrompt = buildSystemPrompt(brief, callBrief, target)
  const dynamicVariables = buildDynamicVariables(brief, callBrief, target)

  const citationsUsed = brief.legalGrounding
    .filter((g) => g.confidence === "grounded")
    .map((g) => g.citation)

  return {
    caseId: brief.caseId,
    targetId: target.id,
    provider: "elevenlabs",
    mode,
    recipient: {
      organizationName: target.organizationName,
      department: target.department,
      toNumber: target.toNumber ?? null,
    },
    callerContext: {
      representedParty: "patient (authorized)",
      patientName: brief.patientContext.fullName ?? null,
    },
    conversation: {
      firstMessage: callBrief.openingScript,
      systemPrompt,
      dynamicVariables,
    },
    constraints: {
      tone: "firm_factual_non_speculative",
      mustSay: callBrief.mustSay,
      prohibitedClaims: callBrief.prohibitedClaims,
      escalationPath: callBrief.escalationPath,
    },
    citationsUsed,
    requestedResolution: brief.requestedResolution,
    generatedAt: new Date().toISOString(),
  }
}
