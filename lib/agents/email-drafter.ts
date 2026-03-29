/**
 * Email Drafter — generates structured dispute email drafts via Lava/OpenAI.
 *
 * Uses outreach brief as the sole source of truth.
 * Legal citations are included only when grounded entries exist.
 * Never sends email — output is a draft for human review.
 */

import { analyze } from "@/lib/ai/transport"
import type { EmailDraftRequest, EmailDraftResponse, OutreachBrief, ContactTarget } from "@/types/outreach"

// ── Helpers ───────────────────────────────────────────────────────────────────

function findTarget(brief: OutreachBrief, targetId: string): ContactTarget | null {
  return brief.contactTargets.find((t) => t.id === targetId) ?? null
}

function formatCurrency(value: number | null): string {
  if (value === null) return "an unspecified amount"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildProviderDisputePrompt(brief: OutreachBrief, target: ContactTarget): string {
  const ef = brief.analysis.extractedFields
  const citations = brief.legalGrounding
    .filter((g) => g.confidence === "grounded")
    .map((g) => `- ${g.citation}: ${g.whyItApplies}`)
    .join("\n")

  const issues = brief.analysis.detectedIssues
    .map((i) => `- ${i.type}: ${i.description}`)
    .join("\n")

  const resolution = brief.requestedResolution.join("\n- ")
  const hasCitations = citations.length > 0

  return `
You are drafting a formal medical billing dispute letter on behalf of a patient.

PATIENT CONTEXT:
- Patient Name: ${brief.patientContext.fullName ?? "[Patient Name — to be filled in]"}
- Member ID: ${brief.patientContext.memberID ?? "[Member ID — to be filled in]"}
- Claim/Account Number: ${brief.patientContext.claimNumber ?? brief.patientContext.accountNumber ?? "[Account Number — to be filled in]"}
- Date of Service: ${brief.documentContext.serviceDate ?? "[Date of Service — to be filled in]"}
- Location of Care: ${brief.documentContext.locationOfCare ?? "[Location — to be filled in]"}

RECIPIENT:
- Organization: ${target.organizationName}
- Department: ${target.department}
- Address: ${target.address ?? "[Address — to be filled in]"}

BILLING ISSUES IDENTIFIED:
${issues}

REQUESTED RESOLUTION:
- ${resolution}

${hasCitations ? `APPLICABLE REGULATIONS:\n${citations}` : "Note: No pre-Veritasfied legal citations are available. Keep tone firm but do not make aggressive legal threats."}

BILLED AMOUNT: ${formatCurrency(ef.billedAmount)}
INSURER PAID: ${formatCurrency(ef.insurerPaid)}
PATIENT RESPONSIBILITY ON BILL: ${formatCurrency(ef.patientResponsibility)}

INSTRUCTIONS:
- Write a formal, professional dispute letter
- Tone: firm, factual, non-speculative
- Do not make legal threats unless supported by the citations above
- Do not invent facts not present in the context above
- Use "[placeholder]" for any information that is missing
- Include a clear subject line
- End with a request for written response within 30 days
- Return JSON only

Return this exact JSON structure:
{
  "subject": "string",
  "body": "string (full letter text, use \\n for line breaks)",
  "citationsUsed": ["citation string", ...],
  "attachmentsToMention": ["string", ...],
  "missingFields": ["field name", ...]
}
`.trim()
}

function buildInsuranceAppealPrompt(brief: OutreachBrief, target: ContactTarget): string {
  const ef = brief.analysis.extractedFields
  const citations = brief.legalGrounding
    .filter((g) => g.confidence === "grounded")
    .map((g) => `- ${g.citation}: ${g.whyItApplies}`)
    .join("\n")

  const issues = brief.analysis.detectedIssues
    .map((i) => `- ${i.type}: ${i.description}`)
    .join("\n")

  const resolution = brief.requestedResolution.join("\n- ")
  const hasCitations = citations.length > 0
  const denialReason = ef.denialReason

  return `
You are drafting a formal insurance appeal letter on behalf of a patient.

PATIENT CONTEXT:
- Patient Name: ${brief.patientContext.fullName ?? "[Patient Name — to be filled in]"}
- Member ID: ${brief.patientContext.memberID ?? "[Member ID — to be filled in]"}
- Claim Number: ${brief.patientContext.claimNumber ?? "[Claim Number — to be filled in]"}
- Date of Service: ${brief.documentContext.serviceDate ?? "[Date of Service — to be filled in]"}

RECIPIENT:
- Insurance Company: ${target.organizationName}
- Department: ${target.department}
- Address: ${target.address ?? "[Address — to be filled in]"}

${denialReason ? `DENIAL REASON: ${denialReason}` : ""}

BILLING ISSUES IDENTIFIED:
${issues}

REQUESTED RESOLUTION:
- ${resolution}

${hasCitations ? `APPLICABLE REGULATIONS:\n${citations}` : "Note: No pre-Veritasfied legal citations are available. Keep tone firm but do not make aggressive legal threats."}

INSURER PAID: ${formatCurrency(ef.insurerPaid)}
PATIENT RESPONSIBILITY PER EOB: ${formatCurrency(ef.patientResponsibility)}

INSTRUCTIONS:
- Write a formal insurance appeal letter
- Reference the patient's right to a full and fair review
- Tone: firm, factual, non-speculative
- Do not make legal threats unless supported by the citations above
- Do not invent facts not present in the context above
- Use "[placeholder]" for any information that is missing
- Include a clear subject line
- Request written determination within the regulatory timeframe
- Return JSON only

Return this exact JSON structure:
{
  "subject": "string",
  "body": "string (full letter text, use \\n for line breaks)",
  "citationsUsed": ["citation string", ...],
  "attachmentsToMention": ["string", ...],
  "missingFields": ["field name", ...]
}
`.trim()
}

// ── Normalizer ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEmailDraft(parsed: any): {
  subject: string
  body: string
  citationsUsed: string[]
  attachmentsToMention: string[]
  missingFields: string[]
} {
  return {
    subject: typeof parsed.subject === "string" ? parsed.subject : "Medical Billing Dispute",
    body: typeof parsed.body === "string" ? parsed.body : "",
    citationsUsed: Array.isArray(parsed.citationsUsed) ? parsed.citationsUsed.map(String) : [],
    attachmentsToMention: Array.isArray(parsed.attachmentsToMention)
      ? parsed.attachmentsToMention.map(String)
      : [],
    missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields.map(String) : [],
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function draftEmail(req: EmailDraftRequest): Promise<EmailDraftResponse> {
  const { outreachBrief: brief, targetId, draftType } = req

  const target = findTarget(brief, targetId)
  if (!target) {
    throw new Error(`Contact target not found: ${targetId}`)
  }

  const prompt =
    draftType === "provider_dispute"
      ? buildProviderDisputePrompt(brief, target)
      : buildInsuranceAppealPrompt(brief, target)

  const raw = await analyze(
    [{ role: "user", content: prompt }],
    0.2
  )

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`Email drafter returned invalid JSON: ${raw.slice(0, 200)}`)
  }

  const normalized = normalizeEmailDraft(parsed)

  return {
    caseId: brief.caseId,
    targetId,
    draftType,
    ...normalized,
    generatedAt: new Date().toISOString(),
  }
}
