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
 *
 * Dynamic variables: IDs and amounts are merged from patientContext, extractedFields,
 * and callBrief.referenceNumbers so nothing is dropped when one source is empty.
 * Missing values are sent as the string "not provided" so {{member_id}} etc. always
 * resolve in the ElevenLabs agent (keys are never omitted for core reference fields).
 */

import type { OutreachBrief, CallBriefResponse, ContactTarget, ElevenLabsCallPayload } from "@/types/outreach"

const NOT_PROVIDED = "not provided"

/** First non-empty trimmed string from analysis, patient context, and call-brief refs. */
function firstNonEmpty(...vals: (string | null | undefined)[]): string | null {
  for (const v of vals) {
    if (v == null) continue
    const s = String(v).trim()
    if (s !== "") return s
  }
  return null
}

function dynVal(v: string | null | undefined): string {
  const s = v != null ? String(v).trim() : ""
  return s === "" ? NOT_PROVIDED : s
}

/** Single source of truth for IDs/amounts sent to ElevenLabs and embedded in prompts. */
export function mergeReferenceData(
  brief: OutreachBrief,
  callBrief: CallBriefResponse
): {
  patientName: string
  memberID: string
  claimNumber: string
  accountNumber: string
  serviceDate: string
  billIssueDate: string
  locationOfCare: string
  providerName: string
  insurerName: string
  denialReason: string
  cptCodes: string
  billedAmount: string
  patientResponsibility: string
  insurerPaid: string
  caseId: string
} {
  const ef = brief.analysis.extractedFields
  const pc = brief.patientContext
  const dc = brief.documentContext
  const ref = callBrief.referenceNumbers

  return {
    patientName: dynVal(firstNonEmpty(pc.fullName, ef.patientName)),
    memberID: dynVal(firstNonEmpty(pc.memberID, ref.memberID, ef.memberID)),
    claimNumber: dynVal(firstNonEmpty(pc.claimNumber, ref.claimNumber, ef.claimNumber)),
    accountNumber: dynVal(firstNonEmpty(pc.accountNumber, ref.accountNumber, ef.accountNumber)),
    serviceDate: dynVal(firstNonEmpty(dc.serviceDate, ef.serviceDate)),
    billIssueDate: dynVal(firstNonEmpty(dc.billIssueDate, ef.billIssueDate)),
    locationOfCare: dynVal(firstNonEmpty(dc.locationOfCare, ef.locationOfCare)),
    providerName: dynVal(ef.provider),
    insurerName: dynVal(ef.insurer),
    denialReason: dynVal(ef.denialReason),
    cptCodes:
      ef.cptCodes.length > 0 ? ef.cptCodes.join(", ") : NOT_PROVIDED,
    billedAmount: ef.billedAmount != null ? String(ef.billedAmount) : NOT_PROVIDED,
    patientResponsibility:
      ef.patientResponsibility != null ? String(ef.patientResponsibility) : NOT_PROVIDED,
    insurerPaid: ef.insurerPaid != null ? String(ef.insurerPaid) : NOT_PROVIDED,
    caseId: brief.caseId,
  }
}

// ── System prompt template ────────────────────────────────────────────────────

function buildSystemPrompt(
  brief: OutreachBrief,
  callBrief: CallBriefResponse,
  target: ContactTarget,
  refs: ReturnType<typeof mergeReferenceData>
): string {
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

  const referenceBlock = `
REFERENCE NUMBERS AND ACCOUNT DETAILS (use these exact values when asked for member ID, claim, account, dates, or amounts — they come from the patient's bill/EOB analysis):
- MedBill case ID: ${refs.caseId}
- Patient name: ${refs.patientName}
- Member / subscriber ID: ${refs.memberID}
- Claim number: ${refs.claimNumber}
- Account / billing number: ${refs.accountNumber}
- Date of service: ${refs.serviceDate}
- Bill issue date: ${refs.billIssueDate}
- Location of care: ${refs.locationOfCare}
- Provider (from documents): ${refs.providerName}
- Insurer / payer (from documents): ${refs.insurerName}
- CPT codes (if any): ${refs.cptCodes}
- Billed amount: ${refs.billedAmount}
- Patient responsibility (bill): ${refs.patientResponsibility}
- Insurer paid: ${refs.insurerPaid}
${refs.denialReason !== NOT_PROVIDED ? `- Denial reason (if applicable): ${refs.denialReason}` : ""}
`.trim()

  return `You are a professional medical billing dispute assistant calling ${orgName}'s ${dept} department on behalf of ${refs.patientName === NOT_PROVIDED ? "the patient" : refs.patientName}, with the patient's explicit authorization.

${referenceBlock}

Your role is to clearly and professionally communicate a billing dispute, request specific corrections, and document the outcome of the call.

COMMUNICATION STYLE:
- Firm, factual, and non-speculative
- Polite and cooperative — you are seeking resolution, not confrontation
- Do not make accusations; state discrepancies as factual observations
- Do not claim legal expertise or threaten litigation unless you have a specific cited regulation
- If asked about your nature, state that you are an AI assistant authorized by the patient
- When the representative asks for account, member, claim, or reference numbers, read them from REFERENCE NUMBERS above (do not invent values)

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
  target: ContactTarget,
  systemPrompt: string,
  refs: ReturnType<typeof mergeReferenceData>
): Record<string, string> {
  const ef = brief.analysis.extractedFields
  const opener = callBrief.openingScript

  const issueSummary = brief.analysis.detectedIssues
    .slice(0, 5)
    .map((i) => i.type.replace(/_/g, " ").toLowerCase())
    .join(", ")

  const requestedRes = brief.requestedResolution.slice(0, 4).join("; ")

  // Multiline block — agents can use {{reference_numbers_summary}} alone
  const referenceNumbersSummary = [
    `Case ID: ${refs.caseId}`,
    `Patient: ${refs.patientName}`,
    `Member ID: ${refs.memberID}`,
    `Claim #: ${refs.claimNumber}`,
    `Account #: ${refs.accountNumber}`,
    `Service date: ${refs.serviceDate}`,
    `Provider: ${refs.providerName}`,
    `Insurer: ${refs.insurerName}`,
    `Billed: ${refs.billedAmount} | Patient resp.: ${refs.patientResponsibility} | Insurer paid: ${refs.insurerPaid}`,
    `CPT: ${refs.cptCodes}`,
  ].join("\n")

  // Single blob for agents whose UI only allows one dynamic variable — use {{medbill_context}} in System prompt / First message
  const medbillContext = [
    "MEDBILL CASE CONTEXT (read verbatim when asked for account or member details):",
    referenceNumbersSummary,
    "",
    `Billing issues: ${issueSummary || NOT_PROVIDED}`,
    `Requested resolution: ${requestedRes || NOT_PROVIDED}`,
    "",
    `Suggested opening: ${dynVal(opener)}`,
  ].join("\n")

  const vars: Record<string, string> = {
    // Core IDs — snake_case (ElevenLabs / common templates)
    patient_name: refs.patientName,
    member_id: refs.memberID,
    claim_number: refs.claimNumber,
    account_number: refs.accountNumber,
    service_date: refs.serviceDate,
    bill_issue_date: refs.billIssueDate,
    location_of_care: refs.locationOfCare,
    provider_name: refs.providerName,
    insurer_name: refs.insurerName,
    denial_reason: refs.denialReason,
    cpt_codes: refs.cptCodes,
    billed_amount: refs.billedAmount,
    patient_responsibility: refs.patientResponsibility,
    insurer_paid: refs.insurerPaid,
    case_id: refs.caseId,
    medbill_case_id: refs.caseId,

    // camelCase aliases (some agent templates use these)
    patientName: refs.patientName,
    memberID: refs.memberID,
    claimNumber: refs.claimNumber,
    accountNumber: refs.accountNumber,
    serviceDate: refs.serviceDate,
    billIssueDate: refs.billIssueDate,
    locationOfCare: refs.locationOfCare,
    providerName: refs.providerName,
    insurerName: refs.insurerName,

    organization_name: target.organizationName,
    department: target.department,
    issue_summary: issueSummary || NOT_PROVIDED,
    requested_resolution: requestedRes || NOT_PROVIDED,
    reference_numbers_summary: referenceNumbersSummary,
    medbill_context: medbillContext,

    opening_script: dynVal(opener),
    first_message: dynVal(opener),
    system_prompt: systemPrompt,
  }

  // All values are non-empty strings — ElevenLabs can resolve every key above
  return vars
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

  const refs = mergeReferenceData(brief, callBrief)
  const systemPrompt = buildSystemPrompt(brief, callBrief, target, refs)
  const dynamicVariables = buildDynamicVariables(brief, callBrief, target, systemPrompt, refs)

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
      patientName: refs.patientName !== NOT_PROVIDED ? refs.patientName : null,
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

/**
 * Server-side: merge fresh reference fields into outbound-call dynamic_variables.
 * Use when the client payload might omit keys after JSON round-trips.
 */
export function mergeDynamicVariablesForOutboundCall(payload: ElevenLabsCallPayload): Record<string, string> {
  const base = { ...payload.conversation.dynamicVariables }
  if (payload.conversation.firstMessage) {
    base.opening_script = payload.conversation.firstMessage
    base.first_message = payload.conversation.firstMessage
  }
  if (payload.conversation.systemPrompt) {
    base.system_prompt = payload.conversation.systemPrompt
  }
  return base
}
