export interface ExtractedFields {
  provider: string | null
  insurer: string | null
  billedAmount: number | null
  insurerPaid: number | null
  patientResponsibility: number | null
  denialReason: string | null
  cptCodes: string[]
  serviceDate: string | null
  claimNumber: string | null
  memberID: string | null
}

export type IssueSeverity = "warning" | "error"

export type IssueType =
  | "BILL_EOB_MISMATCH"
  | "OVERCHARGE"
  | "DENIAL_FLAG"
  | "NO_SURPRISES_ACT_TRIGGER"
  | "DUPLICATE_CHARGE"
  | "UPCODING"
  | "BALANCE_BILLING"

export interface DetectedIssue {
  type: IssueType
  severity: IssueSeverity
  description: string
}

export type ActionCategory =
  | "contact_provider"
  | "file_appeal"
  | "legal_protection"
  | "dispute_self_pay"

export interface RecommendedAction {
  category: ActionCategory
  action: string
  // Future: agentType: "email" | "call" | "letter" | "portal"
}

export interface RelevantLaw {
  title: string
  description: string
}

export interface AnalysisResult {
  /** UUID — ready for DB persistence when Supabase is added */
  caseId: string
  extractedFields: ExtractedFields
  detectedIssues: DetectedIssue[]
  /** Plain-English explanation of findings */
  explanation: string
  recommendedActions: RecommendedAction[]
  /** Up to 3 relevant laws based on detected issues */
  laws: RelevantLaw[]
  /** ISO 8601 timestamp */
  analyzedAt: string
}

/**
 * Future: CaseRecord extends AnalysisResult with DB fields.
 * Defined here as a stub so the action layer can reference it.
 */
export interface CaseRecord extends AnalysisResult {
  userId: string
  status: "pending" | "in_progress" | "resolved"
  documentUrls: string[]
  updatedAt: string
}
