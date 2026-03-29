/**
 * Call Brief Generator — produces a structured phone call script via Lava/OpenAI.
 *
 * Output is a CallBriefResponse with opening script, must-say items,
 * legal points (only when grounded), escalation path, and prohibited claims.
 * Never invents facts or legal citations.
 */

import { analyze } from "@/lib/ai/transport"
import type { CallBriefRequest, CallBriefResponse, OutreachBrief, ContactTarget } from "@/types/outreach"

// ── Helpers ───────────────────────────────────────────────────────────────────

function findTarget(brief: OutreachBrief, targetId: string): ContactTarget | null {
  return brief.contactTargets.find((t) => t.id === targetId) ?? null
}

function formatCurrency(value: number | null): string {
  if (value === null) return "an unspecified amount"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildCallBriefPrompt(brief: OutreachBrief, target: ContactTarget): string {
  const ef = brief.analysis.extractedFields
  const citations = brief.legalGrounding
    .filter((g) => g.confidence === "grounded" && g.priority === "high")
    .map((g) => `- ${g.citation}: ${g.whyItApplies}`)
    .join("\n")

  const issues = brief.analysis.detectedIssues
    .map((i) => `- ${i.type} (${i.severity}): ${i.description}`)
    .join("\n")

  const resolution = brief.requestedResolution.join("; ")
  const hasCitations = citations.length > 0

  const patientName = brief.patientContext.fullName ?? "[Patient Name]"
  const memberID = brief.patientContext.memberID ?? null
  const claimNumber = brief.patientContext.claimNumber ?? null
  const accountNumber = brief.patientContext.accountNumber ?? null
  const serviceDate = brief.documentContext.serviceDate ?? "[Date of Service]"
  const orgName = target.organizationName
  const dept = target.department

  return `
You are generating a structured phone call brief for a medical billing dispute call.
The caller is an AI assistant acting on behalf of a patient with the patient's authorization.

CALL CONTEXT:
- Calling: ${orgName} — ${dept} department
- On behalf of patient: ${patientName}
- Member ID: ${memberID ?? "not available"}
- Claim Number: ${claimNumber ?? "not available"}
- Account Number: ${accountNumber ?? "not available"}
- Date of Service: ${serviceDate}
- Billed Amount: ${formatCurrency(ef.billedAmount)}
- Patient Responsibility on Bill: ${formatCurrency(ef.patientResponsibility)}
- Insurer Paid: ${formatCurrency(ef.insurerPaid)}

BILLING ISSUES:
${issues}

REQUESTED RESOLUTION:
${resolution}

${hasCitations ? `GROUNDED LEGAL POINTS (use only these):\n${citations}` : "No pre-verified legal citations available. Do not reference specific laws unless listed above."}

TONE GUIDANCE:
- Style: firm, factual, non-speculative
- Do not make threats or accusations
- Do not invent facts
- Sound professional and cooperative
- Optimize for first-call resolution

INSTRUCTIONS:
Generate a structured call brief. Return JSON only.

Return this exact JSON structure:
{
  "openingScript": "string — the exact opening statement the caller should say (2-4 sentences)",
  "mustSay": ["string", ...],
  "legalPoints": ["string", ...],
  "escalationPath": ["string", ...],
  "prohibitedClaims": ["string", ...]
}

Guidelines:
- openingScript: Professional opening that states who is calling, on whose behalf, and the purpose
- mustSay: 3-6 specific factual points that must be communicated (amounts, dates, issue types)
- legalPoints: Only include if grounded citations are available above; otherwise return []
- escalationPath: Steps to take if the representative cannot resolve (e.g., ask for supervisor, request written response)
- prohibitedClaims: Statements the caller must NOT make (speculative, unverified, or legally risky claims)
`.trim()
}

// ── Normalizer ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCallBrief(parsed: any): {
  openingScript: string
  mustSay: string[]
  legalPoints: string[]
  escalationPath: string[]
  prohibitedClaims: string[]
} {
  return {
    openingScript: typeof parsed.openingScript === "string" ? parsed.openingScript : "",
    mustSay: Array.isArray(parsed.mustSay) ? parsed.mustSay.map(String) : [],
    legalPoints: Array.isArray(parsed.legalPoints) ? parsed.legalPoints.map(String) : [],
    escalationPath: Array.isArray(parsed.escalationPath) ? parsed.escalationPath.map(String) : [],
    prohibitedClaims: Array.isArray(parsed.prohibitedClaims) ? parsed.prohibitedClaims.map(String) : [],
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateCallBrief(req: CallBriefRequest): Promise<CallBriefResponse> {
  const { outreachBrief: brief, targetId } = req

  const target = findTarget(brief, targetId)
  if (!target) {
    throw new Error(`Contact target not found: ${targetId}`)
  }

  const prompt = buildCallBriefPrompt(brief, target)

  const raw = await analyze(
    [{ role: "user", content: prompt }],
    0.2
  )

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`Call brief generator returned invalid JSON: ${raw.slice(0, 200)}`)
  }

  const normalized = normalizeCallBrief(parsed)

  const ef = brief.analysis.extractedFields
  return {
    caseId: brief.caseId,
    targetId,
    ...normalized,
    referenceNumbers: {
      memberID: brief.patientContext.memberID ?? ef.memberID ?? null,
      claimNumber: brief.patientContext.claimNumber ?? ef.claimNumber ?? null,
      accountNumber: brief.patientContext.accountNumber ?? ef.accountNumber ?? null,
    },
    generatedAt: new Date().toISOString(),
  }
}
