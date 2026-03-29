/**
 * Legal Grounding Service — pure, side-effect-free module.
 *
 * Returns structured LegalGroundingEntry[] from analysis context.
 * Uses a deterministic static bundle for well-known issue types,
 * then optionally enriches via Lava/OpenAI if credentials are available.
 *
 * Conservative rule: if citations cannot be grounded with confidence,
 * return [] and let downstream generators stay non-aggressive.
 */

import { v4 as uuidv4 } from "uuid"
import { analyze } from "@/lib/ai/transport"
import type { AnalysisResult, IssueType } from "@/types/analysis"
import type { LegalGroundingEntry } from "@/types/outreach"

// ── Static grounding bundle ───────────────────────────────────────────────────
// Well-known federal protections with high confidence.
// These are cited only when the matching issue type is present in the analysis.

const STATIC_GROUNDING: Record<IssueType, LegalGroundingEntry[]> = {
  NO_SURPRISES_ACT_TRIGGER: [
    {
      id: uuidv4(),
      issueType: "NO_SURPRISES_ACT_TRIGGER",
      citation: "42 U.S.C. § 300gg-111 (No Surprises Act)",
      title: "No Surprises Act — Balance Billing Prohibition",
      sourceUrl: "https://www.cms.gov/nosurprises",
      jurisdiction: "federal",
      whyItApplies:
        "Prohibits surprise billing for emergency services and certain non-emergency services at in-network facilities. Limits patient cost-sharing to in-network amounts.",
      priority: "high",
      confidence: "grounded",
    },
  ],
  BALANCE_BILLING: [
    {
      id: uuidv4(),
      issueType: "BALANCE_BILLING",
      citation: "42 U.S.C. § 300gg-111 (No Surprises Act)",
      title: "No Surprises Act — Balance Billing Prohibition",
      sourceUrl: "https://www.cms.gov/nosurprises",
      jurisdiction: "federal",
      whyItApplies:
        "Providers may not bill patients for amounts above the in-network cost-sharing amount for covered services at in-network facilities.",
      priority: "high",
      confidence: "grounded",
    },
  ],
  BILL_EOB_MISMATCH: [
    {
      id: uuidv4(),
      issueType: "BILL_EOB_MISMATCH",
      citation: "45 C.F.R. § 147.138 (ACA — Transparency in Coverage)",
      title: "ACA Transparency — EOB Accuracy Requirements",
      sourceUrl: "https://www.hhs.gov/healthcare/about-the-aca/index.html",
      jurisdiction: "federal",
      whyItApplies:
        "Insurers must provide accurate Explanations of Benefits. Discrepancies between the EOB and provider bill may indicate a billing error that the insurer must investigate.",
      priority: "medium",
      confidence: "grounded",
    },
  ],
  OVERCHARGE: [
    {
      id: uuidv4(),
      issueType: "OVERCHARGE",
      citation: "42 C.F.R. § 489.20 (Medicare Conditions of Participation — Billing)",
      title: "Medicare Billing Accuracy Requirements",
      sourceUrl: "https://www.cms.gov/medicare",
      jurisdiction: "federal",
      whyItApplies:
        "Providers participating in Medicare must bill accurately and cannot charge patients more than the Medicare-approved amount for covered services.",
      priority: "medium",
      confidence: "needs_review",
    },
  ],
  DUPLICATE_CHARGE: [
    {
      id: uuidv4(),
      issueType: "DUPLICATE_CHARGE",
      citation: "42 U.S.C. § 1320a-7b (Anti-Kickback / False Claims context)",
      title: "False Claims Act — Duplicate Billing",
      sourceUrl: "https://oig.hhs.gov/compliance/physician-education/01laws.asp",
      jurisdiction: "federal",
      whyItApplies:
        "Billing for the same service twice constitutes a false claim. Patients may dispute duplicate charges and request written correction.",
      priority: "high",
      confidence: "grounded",
    },
  ],
  UPCODING: [
    {
      id: uuidv4(),
      issueType: "UPCODING",
      citation: "42 U.S.C. § 1320a-7b(b) (False Claims Act — Upcoding)",
      title: "False Claims Act — Upcoding Prohibition",
      sourceUrl: "https://oig.hhs.gov/fraud/docs/alertsandbulletins/upcoding.pdf",
      jurisdiction: "federal",
      whyItApplies:
        "Billing a higher-complexity CPT code than the service rendered is upcoding and constitutes a false claim. Patients may request a coding review.",
      priority: "high",
      confidence: "grounded",
    },
  ],
  DENIAL_FLAG: [
    {
      id: uuidv4(),
      issueType: "DENIAL_FLAG",
      citation: "45 C.F.R. § 147.136 (ACA — Internal Claims and Appeals)",
      title: "ACA — Right to Internal Appeal of Denied Claims",
      sourceUrl: "https://www.dol.gov/sites/dolgov/files/EBSA/about-ebsa/our-activities/resource-center/faqs/aca-part-vi.pdf",
      jurisdiction: "federal",
      whyItApplies:
        "Insurers must provide a full and fair internal review of denied claims. Patients have the right to appeal denials within specified timeframes.",
      priority: "high",
      confidence: "grounded",
    },
  ],
}

// ── JSON schema for LLM-enriched grounding ───────────────────────────────────

const GROUNDING_SCHEMA = `
Return a JSON object with this exact structure:
{
  "entries": [
    {
      "issueType": "BILL_EOB_MISMATCH" | "OVERCHARGE" | "DENIAL_FLAG" | "NO_SURPRISES_ACT_TRIGGER" | "DUPLICATE_CHARGE" | "UPCODING" | "BALANCE_BILLING",
      "citation": "Exact statute citation (e.g. 42 U.S.C. § 300gg-111)",
      "title": "Short title of the law or regulation",
      "sourceUrl": "URL to official source or null",
      "jurisdiction": "federal" | "state" | "payer_policy" | "provider_policy",
      "whyItApplies": "One sentence explaining why this applies to the patient's specific situation",
      "priority": "high" | "medium" | "low",
      "confidence": "grounded" | "needs_review"
    }
  ]
}

RULES:
- Only include citations you are confident are real and accurately cited
- Do not invent statute numbers or URLs
- If you are not certain a citation is accurate, set confidence to "needs_review"
- Return at most 3 entries per issue type
- If you cannot produce a grounded citation for an issue, omit it entirely
- Do not include entries for issue types not present in the analysis
`

// ── Main export ───────────────────────────────────────────────────────────────

export async function getLegalGrounding(input: {
  analysis: AnalysisResult
}): Promise<LegalGroundingEntry[]> {
  const { analysis } = input
  const issueTypes = analysis.detectedIssues.map((i) => i.type)

  if (issueTypes.length === 0) return []

  // Start with static grounding for detected issue types
  const staticEntries: LegalGroundingEntry[] = []
  for (const issueType of issueTypes) {
    const entries = STATIC_GROUNDING[issueType as IssueType]
    if (entries) {
      staticEntries.push(...entries.map((e) => ({ ...e, id: uuidv4() })))
    }
  }

  // If no Lava key, return static bundle only
  if (!process.env.LAVA_SECRET_KEY) {
    return staticEntries
  }

  // Attempt LLM enrichment for issue-specific context
  try {
    const issueDescriptions = analysis.detectedIssues
      .map((i) => `- ${i.type}: ${i.description}`)
      .join("\n")

    const systemPrompt = `You are a medical billing legal researcher. Your job is to identify real, accurately-cited federal laws and regulations that apply to specific medical billing issues. Only cite laws you are certain exist with accurate section numbers. ${GROUNDING_SCHEMA}`

    const userMessage = `
The patient has the following billing issues:
${issueDescriptions}

Provider: ${analysis.extractedFields.provider ?? "Unknown"}
Insurer: ${analysis.extractedFields.insurer ?? "Unknown"}
Billed: $${analysis.extractedFields.billedAmount ?? "Unknown"}
Patient Responsibility: $${analysis.extractedFields.patientResponsibility ?? "Unknown"}

Identify applicable federal laws and regulations. Only include entries where you are confident the citation is accurate.
`.trim()

    const raw = await analyze(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      0.1
    )

    const parsed = JSON.parse(raw) as { entries?: unknown[] }
    const llmEntries = Array.isArray(parsed.entries) ? parsed.entries : []

    const normalized: LegalGroundingEntry[] = llmEntries
      .filter(
        (e): e is Record<string, unknown> =>
          typeof e === "object" && e !== null && typeof (e as Record<string, unknown>).citation === "string"
      )
      .map((e) => ({
        id: uuidv4(),
        issueType: (e.issueType as IssueType) ?? issueTypes[0],
        citation: String(e.citation ?? ""),
        title: String(e.title ?? ""),
        sourceUrl: typeof e.sourceUrl === "string" ? e.sourceUrl : null,
        jurisdiction: (["federal", "state", "payer_policy", "provider_policy"].includes(String(e.jurisdiction))
          ? e.jurisdiction
          : "federal") as LegalGroundingEntry["jurisdiction"],
        whyItApplies: String(e.whyItApplies ?? ""),
        priority: (["high", "medium", "low"].includes(String(e.priority)) ? e.priority : "medium") as LegalGroundingEntry["priority"],
        confidence: (["grounded", "needs_review"].includes(String(e.confidence)) ? e.confidence : "needs_review") as LegalGroundingEntry["confidence"],
      }))

    // Merge: prefer LLM entries but keep static ones not duplicated by citation
    const llmCitations = new Set(normalized.map((e) => e.citation))
    const dedupedStatic = staticEntries.filter((e) => !llmCitations.has(e.citation))

    return [...normalized, ...dedupedStatic]
  } catch (err) {
    console.warn("[legal] LLM enrichment failed, using static bundle only:", err)
    return staticEntries
  }
}
