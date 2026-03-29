import type { AnalysisResult, IssueType } from "@/types/analysis"

export type ContactAudience = "provider" | "insurer"
export type ContactDepartment = "billing" | "appeals" | "customer_service" | "medical_records"
export type ContactChannel = "email" | "phone" | "mail" | "portal"

export interface ContactTarget {
  id: string
  audience: ContactAudience
  organizationName: string
  department: ContactDepartment
  contactName: string | null
  toEmail: string | null
  toNumber: string | null
  address: string | null
  preferredChannels: ContactChannel[]
  source: "extracted" | "model_inferred" | "user_provided" | "needs_review"
  notes: string | null
}

export interface PatientContext {
  fullName: string | null
  address: string | null
  memberID: string | null
  claimNumber: string | null
  accountNumber: string | null
}

export interface DocumentContext {
  serviceDate: string | null
  billIssueDate: string | null
  locationOfCare: string | null
  providerAddress: string | null
  insurerAddress: string | null
}

export interface LegalGroundingEntry {
  id: string
  issueType: IssueType
  citation: string
  title: string
  sourceUrl: string | null
  jurisdiction: "federal" | "state" | "payer_policy" | "provider_policy"
  whyItApplies: string
  priority: "high" | "medium" | "low"
  confidence: "grounded" | "needs_review"
}

export interface OutreachToneGuidance {
  style: "firm_factual_non_speculative"
  mentionLegalEscalation: boolean
  requireCitationGrounding: boolean
}

export interface OutreachBrief {
  caseId: string
  analysis: AnalysisResult
  contactTargets: ContactTarget[]
  patientContext: PatientContext
  documentContext: DocumentContext
  legalGrounding: LegalGroundingEntry[]
  requestedResolution: string[]
  missingFields: string[]
  toneGuidance: OutreachToneGuidance
  generatedAt: string
}

export type EmailDraftType = "provider_dispute" | "insurance_appeal"

export interface EmailDraftRequest {
  outreachBrief: OutreachBrief
  targetId: string
  draftType: EmailDraftType
}

export interface EmailDraftResponse {
  caseId: string
  targetId: string
  draftType: EmailDraftType
  subject: string
  body: string
  citationsUsed: string[]
  attachmentsToMention: string[]
  missingFields: string[]
  generatedAt: string
}

export interface CallBriefRequest {
  outreachBrief: OutreachBrief
  targetId: string
}

export interface CallBriefResponse {
  caseId: string
  targetId: string
  openingScript: string
  mustSay: string[]
  legalPoints: string[]
  escalationPath: string[]
  prohibitedClaims: string[]
  referenceNumbers: {
    memberID: string | null
    claimNumber: string | null
    accountNumber: string | null
  }
  generatedAt: string
}

export interface ElevenLabsCallPayload {
  caseId: string
  targetId: string
  provider: "elevenlabs"
  mode: "preview" | "conversation_config"
  recipient: {
    organizationName: string
    department: string
    toNumber: string | null
  }
  callerContext: {
    representedParty: string
    patientName: string | null
  }
  conversation: {
    firstMessage: string
    systemPrompt: string
    dynamicVariables: Record<string, string>
  }
  constraints: {
    tone: "firm_factual_non_speculative"
    mustSay: string[]
    prohibitedClaims: string[]
    escalationPath: string[]
  }
  citationsUsed: string[]
  requestedResolution: string[]
  generatedAt: string
}
