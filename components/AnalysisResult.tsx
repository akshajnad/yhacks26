"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { AnalysisResult, ActionCategory, IssueSeverity } from "@/types/analysis"

interface AnalysisResultProps {
  result: AnalysisResult
}

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  contact_provider: "Contact Provider",
  file_appeal: "File Appeal",
  legal_protection: "Legal Protection",
  dispute_self_pay: "Dispute / Self-Pay",
}

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  contact_provider: "bg-blue-100 text-blue-800",
  file_appeal: "bg-purple-100 text-purple-800",
  legal_protection: "bg-red-100 text-red-800",
  dispute_self_pay: "bg-amber-100 text-amber-800",
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  BILL_EOB_MISMATCH: "Bill/EOB Mismatch",
  OVERCHARGE: "Overcharge",
  DENIAL_FLAG: "Denial Flag",
  NO_SURPRISES_ACT_TRIGGER: "No Surprises Act",
  DUPLICATE_CHARGE: "Duplicate Charge",
  UPCODING: "Upcoding",
  BALANCE_BILLING: "Balance Billing",
}

function formatCurrency(value: number | null): string {
  if (value === null) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return value
}

export function AnalysisResultDisplay({ result }: AnalysisResultProps) {
  const caseId = result.caseId ?? "unknown"
  const analyzedAt = result.analyzedAt ?? new Date().toISOString()
  const explanation = result.explanation ?? "No explanation provided."
  const detectedIssues = result.detectedIssues ?? []
  const recommendedActions = result.recommendedActions ?? []
  const ef = result.extractedFields
  const extractedFields = {
    provider: ef?.provider ?? null,
    insurer: ef?.insurer ?? null,
    billedAmount: ef?.billedAmount ?? null,
    insurerPaid: ef?.insurerPaid ?? null,
    patientResponsibility: ef?.patientResponsibility ?? null,
    denialReason: ef?.denialReason ?? null,
    cptCodes: Array.isArray(ef?.cptCodes) ? ef.cptCodes : [],
    serviceDate: ef?.serviceDate ?? null,
    claimNumber: ef?.claimNumber ?? null,
    memberID: ef?.memberID ?? null,
  }

  const errorCount = detectedIssues.filter((i) => i.severity === "error").length
  const warningCount = detectedIssues.filter((i) => i.severity === "warning").length

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--muted)] px-4 py-3">
        <div>
          <p className="text-xs text-[var(--muted-foreground)]">Case ID: {caseId}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Analyzed {new Date(analyzedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          {errorCount > 0 && (
            <Badge variant="error">{errorCount} error{errorCount !== 1 ? "s" : ""}</Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="warning">{warningCount} warning{warningCount !== 1 ? "s" : ""}</Badge>
          )}
          {detectedIssues.length === 0 && (
            <Badge variant="secondary">No issues detected</Badge>
          )}
        </div>
      </div>

      {/* Section 1: Extracted Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DocumentIcon />
            Extracted Fields
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Provider" value={extractedFields.provider} />
            <Field label="Insurer" value={extractedFields.insurer} />
            <Field label="Service Date" value={formatDate(extractedFields.serviceDate)} />
            <Field label="Claim Number" value={extractedFields.claimNumber} />
            <Field label="Member ID" value={extractedFields.memberID} />
            <Field label="Billed Amount" value={formatCurrency(extractedFields.billedAmount)} />
            <Field label="Insurer Paid" value={formatCurrency(extractedFields.insurerPaid)} />
            <Field label="Your Responsibility" value={formatCurrency(extractedFields.patientResponsibility)} isHighlight />
          </div>

          {extractedFields.cptCodes.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">CPT Codes</p>
                <div className="flex flex-wrap gap-2">
                  {extractedFields.cptCodes.map((code) => (
                    <Badge key={code} variant="outline" className="font-mono">
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {extractedFields.denialReason && (
            <>
              <Separator className="my-4" />
              <Field label="Denial Reason" value={extractedFields.denialReason} isFullWidth />
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Issues Detected */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertIcon />
            Issues Detected
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detectedIssues.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No billing issues detected in this document.
            </p>
          ) : (
            <div className="space-y-3">
              {detectedIssues.map((issue, i) => (
                <IssueCard key={i} issue={issue} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InfoIcon />
            Plain-English Explanation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-[var(--foreground)]">{explanation}</p>
        </CardContent>
      </Card>

      {/* Section 4: Recommended Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckIcon />
            Recommended Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recommendedActions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No specific actions recommended.</p>
          ) : (
            <ol className="space-y-3">
              {recommendedActions.map((action, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[action.category]}`}>
                      {CATEGORY_LABELS[action.category]}
                    </span>
                    <p className="text-sm text-[var(--foreground)]">{action.action}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Take Action (stubbed) */}
      <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center">
        <p className="mb-3 text-sm text-[var(--muted-foreground)]">
          Ready to act? The action layer (automated emails, calls, and appeals) is coming in the next module.
        </p>
        <Button disabled variant="outline" className="gap-2">
          <LightningIcon />
          Take Action
          <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
            Coming soon
          </span>
        </Button>
      </div>
    </div>
  )
}

// ---- Sub-components ----

function Field({
  label,
  value,
  isHighlight = false,
  isFullWidth = false,
}: {
  label: string
  value: string | null
  isHighlight?: boolean
  isFullWidth?: boolean
}) {
  return (
    <div className={isFullWidth ? "col-span-full" : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
      <p className={`mt-0.5 text-sm ${isHighlight ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]"} ${!value ? "text-[var(--muted-foreground)]" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  )
}

function IssueCard({ issue }: { issue: { type: string; severity: IssueSeverity; description: string } }) {
  const isError = issue.severity === "error"
  return (
    <div className={`rounded-lg border p-3 ${isError ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-start gap-2">
        <Badge variant={isError ? "error" : "warning"} className="mt-0.5 shrink-0">
          {ISSUE_TYPE_LABELS[issue.type] ?? issue.type}
        </Badge>
        <p className="text-sm text-[var(--foreground)]">{issue.description}</p>
      </div>
    </div>
  )
}

// ---- Icons ----

function DocumentIcon() {
  return (
    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function LightningIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}
