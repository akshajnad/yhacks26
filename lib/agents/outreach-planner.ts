/**
 * Outreach Planner — Phase 2 of the MedBill dispute pipeline.
 *
 * Converts an AnalysisResult into a structured OutreachBrief.
 * Deterministic mapping first; LLM inference only where required.
 * Never invents contact info — leaves unknown fields null and marks them missing.
 */

import { v4 as uuidv4 } from "uuid"
import { getLegalGrounding } from "@/lib/agents/legal"
import type { AnalysisResult, IssueType } from "@/types/analysis"
import type {
  OutreachBrief,
  ContactTarget,
  PatientContext,
  DocumentContext,
  LegalGroundingEntry,
  OutreachToneGuidance,
} from "@/types/outreach"

// ── Contact target resolution ─────────────────────────────────────────────────

/**
 * Determine which audiences to contact based on detected issue types.
 * Returns a prioritized list of ContactTarget objects with null contact info.
 * Contact details are never invented — they remain null and flagged as missing.
 */
function resolveContactTargets(analysis: AnalysisResult): ContactTarget[] {
  const issueTypes = new Set(analysis.detectedIssues.map((i) => i.type as IssueType))
  const targets: ContactTarget[] = []

  const needsProvider =
    issueTypes.has("DUPLICATE_CHARGE") ||
    issueTypes.has("UPCODING") ||
    issueTypes.has("OVERCHARGE") ||
    issueTypes.has("BALANCE_BILLING") ||
    issueTypes.has("BILL_EOB_MISMATCH")

  const needsInsurer =
    issueTypes.has("DENIAL_FLAG") ||
    issueTypes.has("NO_SURPRISES_ACT_TRIGGER") ||
    issueTypes.has("BILL_EOB_MISMATCH")

  if (needsProvider) {
    targets.push({
      id: uuidv4(),
      audience: "provider",
      organizationName: analysis.extractedFields.provider ?? "Healthcare Provider",
      department: "billing",
      contactName: null,
      toEmail: null,
      toNumber: null,
      address: analysis.extractedFields.providerAddress ?? null,
      preferredChannels: ["email", "phone", "mail"],
      source: analysis.extractedFields.provider ? "extracted" : "needs_review",
      notes: "Contact the billing department to dispute charges and request an itemized statement.",
    })
  }

  if (needsInsurer) {
    targets.push({
      id: uuidv4(),
      audience: "insurer",
      organizationName: analysis.extractedFields.insurer ?? "Insurance Company",
      department: issueTypes.has("DENIAL_FLAG") ? "appeals" : "customer_service",
      contactName: null,
      toEmail: null,
      toNumber: null,
      address: analysis.extractedFields.insurerAddress ?? null,
      preferredChannels: ["email", "phone", "portal"],
      source: analysis.extractedFields.insurer ? "extracted" : "needs_review",
      notes: issueTypes.has("DENIAL_FLAG")
        ? "File a formal appeal with the appeals department."
        : "Contact to verify EOB accuracy and request claim review.",
    })
  }

  // If no specific targets resolved, add a generic provider target
  if (targets.length === 0) {
    targets.push({
      id: uuidv4(),
      audience: "provider",
      organizationName: analysis.extractedFields.provider ?? "Healthcare Provider",
      department: "billing",
      contactName: null,
      toEmail: null,
      toNumber: null,
      address: analysis.extractedFields.providerAddress ?? null,
      preferredChannels: ["email", "phone"],
      source: "needs_review",
      notes: "General billing inquiry.",
    })
  }

  return targets
}

// ── Resolution requests ───────────────────────────────────────────────────────

function buildRequestedResolution(analysis: AnalysisResult): string[] {
  const issueTypes = new Set(analysis.detectedIssues.map((i) => i.type as IssueType))
  const resolutions: string[] = []

  if (issueTypes.has("DUPLICATE_CHARGE")) {
    resolutions.push("Remove duplicate charge(s) and issue a corrected bill.")
  }
  if (issueTypes.has("UPCODING")) {
    resolutions.push("Review and correct CPT coding to match the actual service rendered.")
  }
  if (issueTypes.has("OVERCHARGE") || issueTypes.has("BALANCE_BILLING")) {
    resolutions.push("Adjust patient balance to match the insurer-determined patient responsibility amount.")
  }
  if (issueTypes.has("BILL_EOB_MISMATCH")) {
    resolutions.push("Reconcile the provider bill with the Explanation of Benefits and issue a corrected statement.")
  }
  if (issueTypes.has("DENIAL_FLAG")) {
    resolutions.push("Conduct a full internal review of the denied claim and provide a written determination.")
  }
  if (issueTypes.has("NO_SURPRISES_ACT_TRIGGER")) {
    resolutions.push("Limit patient cost-sharing to in-network amounts as required by the No Surprises Act.")
  }

  if (resolutions.length === 0) {
    resolutions.push("Provide an itemized bill and review all charges for accuracy.")
  }

  return resolutions
}

// ── Missing fields detection ──────────────────────────────────────────────────

function detectMissingFields(
  analysis: AnalysisResult,
  targets: ContactTarget[]
): string[] {
  const missing: string[] = []
  const ef = analysis.extractedFields

  if (!ef.patientName) missing.push("patientName")
  if (!ef.memberID) missing.push("memberID")
  if (!ef.claimNumber && !ef.accountNumber) missing.push("claimNumber / accountNumber")
  if (!ef.serviceDate) missing.push("serviceDate")

  for (const target of targets) {
    if (!target.toEmail) missing.push(`${target.audience}.toEmail`)
    if (!target.toNumber) missing.push(`${target.audience}.toNumber`)
    if (!target.address) missing.push(`${target.audience}.address`)
  }

  return [...new Set(missing)]
}

// ── Tone guidance ─────────────────────────────────────────────────────────────

function buildToneGuidance(analysis: AnalysisResult): OutreachToneGuidance {
  const hasHighSeverity = analysis.detectedIssues.some((i) => i.severity === "error")
  const hasNSATrigger = analysis.detectedIssues.some(
    (i) => i.type === "NO_SURPRISES_ACT_TRIGGER" || i.type === "BALANCE_BILLING"
  )

  return {
    style: "firm_factual_non_speculative",
    mentionLegalEscalation: hasHighSeverity || hasNSATrigger,
    requireCitationGrounding: true,
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function planOutreach(input: {
  analysis: AnalysisResult
}): Promise<OutreachBrief> {
  const { analysis } = input
  const ef = analysis.extractedFields

  const patientContext: PatientContext = {
    fullName: ef.patientName ?? null,
    address: ef.patientAddress ?? null,
    memberID: ef.memberID ?? null,
    claimNumber: ef.claimNumber ?? null,
    accountNumber: ef.accountNumber ?? null,
  }

  const documentContext: DocumentContext = {
    serviceDate: ef.serviceDate ?? null,
    billIssueDate: ef.billIssueDate ?? null,
    locationOfCare: ef.locationOfCare ?? null,
    providerAddress: ef.providerAddress ?? null,
    insurerAddress: ef.insurerAddress ?? null,
  }

  const contactTargets = resolveContactTargets(analysis)
  const requestedResolution = buildRequestedResolution(analysis)
  const toneGuidance = buildToneGuidance(analysis)
  const missingFields = detectMissingFields(analysis, contactTargets)

  // Legal grounding — gracefully degrades to [] on failure
  let legalGrounding: LegalGroundingEntry[] = []
  try {
    legalGrounding = await getLegalGrounding({ analysis })
  } catch (err) {
    console.warn("[outreach-planner] Legal grounding failed, continuing without citations:", err)
  }

  return {
    caseId: analysis.caseId,
    analysis,
    contactTargets,
    patientContext,
    documentContext,
    legalGrounding,
    requestedResolution,
    missingFields,
    toneGuidance,
    generatedAt: new Date().toISOString(),
  }
}
