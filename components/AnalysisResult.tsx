"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CircleCheckBig,
  Clock3,
  FileText,
  Landmark,
  Mail,
  Phone,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { ActionCenter } from "@/components/ActionCenter"
import { Button } from "@/components/ui/button"
import type { AnalysisResult, DetectedIssue, IssueType, RecommendedAction } from "@/types/analysis"
import { cn } from "@/lib/utils"

interface AnalysisResultProps {
  result: AnalysisResult
  progressive?: boolean
}

const CATEGORY_LABELS: Record<RecommendedAction["category"], string> = {
  contact_provider: "Contact provider billing",
  file_appeal: "File insurance appeal",
  legal_protection: "Use legal protection",
  dispute_self_pay: "Dispute self-pay balance",
}

const ISSUE_LABELS: Record<IssueType, string> = {
  BILL_EOB_MISMATCH: "Bill vs EOB mismatch",
  OVERCHARGE: "Potential overcharge",
  DENIAL_FLAG: "Claim denial flag",
  NO_SURPRISES_ACT_TRIGGER: "No Surprises Act trigger",
  DUPLICATE_CHARGE: "Duplicate charge",
  UPCODING: "Possible upcoding",
  BALANCE_BILLING: "Balance billing risk",
}

const ISSUE_REASONING: Record<IssueType, { summary: string; evidence: string[]; next: string }> = {
  BILL_EOB_MISMATCH: {
    summary: "Patient responsibility on the bill appears inconsistent with the insurer response.",
    evidence: [
      "The bill and EOB suggest different amounts are owed by the patient.",
      "That difference usually needs a corrected provider statement or adjudication review.",
    ],
    next: "Ask the provider to reconcile the bill against the insurer response before collections continue.",
  },
  OVERCHARGE: {
    summary: "The charged amount appears higher than expected for the documented service.",
    evidence: [
      "The billed amount may exceed what should have been charged for the care described.",
      "A coded line-item breakdown is usually needed to validate the balance.",
    ],
    next: "Request the coded charge detail and challenge the amount if the breakdown is unsupported.",
  },
  DENIAL_FLAG: {
    summary: "The insurer response shows a denial that may still be reviewable.",
    evidence: [
      "A denial can shift costs to the patient even when more documentation is available.",
      "This usually needs a clear appeal path and supporting records.",
    ],
    next: "Prepare an insurer appeal with the supporting bill, EOB, and any denial notice.",
  },
  NO_SURPRISES_ACT_TRIGGER: {
    summary: "The case may involve protections against certain surprise medical bills.",
    evidence: [
      "The billing pattern may qualify for federal protections depending on care setting and network status.",
      "The relevant legal pathway should be reviewed before payment is accepted.",
    ],
    next: "Document the visit context and pursue the protection pathway before responding to the bill.",
  },
  DUPLICATE_CHARGE: {
    summary: "Two line items appear similar enough that they may represent the same service twice.",
    evidence: [
      "Repeated provider, service, or date patterns can point to duplicate billing.",
      "This kind of issue usually needs the provider to correct the statement first.",
    ],
    next: "Ask billing to remove or justify the repeated line item and send a corrected statement.",
  },
  UPCODING: {
    summary: "The coding level may not match the care complexity reflected in the record.",
    evidence: [
      "A higher coding level can inflate both the bill and patient responsibility.",
      "The strongest review path compares the code used with the documented visit details.",
    ],
    next: "Request a coding review and supporting documentation from the provider.",
  },
  BALANCE_BILLING: {
    summary: "The patient may have been billed for an amount that should not have been passed through directly.",
    evidence: [
      "Network status and service context can affect whether balance billing is allowed.",
      "This issue is often resolved by pausing collections while eligibility is reviewed.",
    ],
    next: "Ask the provider to suspend collection activity while billing status is reviewed.",
  },
}

const timelineStages = [
  "Uploaded",
  "Under review",
  "Issues found",
  "Draft prepared",
  "Submitted",
  "Awaiting response",
  "Resolved",
]

function formatCurrency(value: number | null): string {
  if (value === null) return "Not available"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null): string {
  if (!value) return "Not available"
  return value
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString()
}

function getPotentialSavings(result: AnalysisResult): number | null {
  const patientResponsibility = result.extractedFields.patientResponsibility
  if (typeof patientResponsibility === "number" && patientResponsibility > 0) {
    return patientResponsibility
  }

  const billedAmount = result.extractedFields.billedAmount
  const insurerPaid = result.extractedFields.insurerPaid
  if (typeof billedAmount === "number" && typeof insurerPaid === "number") {
    const delta = billedAmount - insurerPaid
    return delta > 0 ? delta : null
  }

  return null
}

function buildReviewRows(result: AnalysisResult) {
  const issues = result.detectedIssues
  const fallbackTitle = result.extractedFields.provider || "Reviewed charge"

  if (issues.length === 0) {
    return [
      {
        title: fallbackTitle,
        subtitle: result.explanation || "No obvious issues were detected in the uploaded documents.",
        billed: formatCurrency(result.extractedFields.billedAmount),
        patient: formatCurrency(result.extractedFields.patientResponsibility),
        status: "Clear",
        issue: null as DetectedIssue | null,
      },
    ]
  }

  return issues.map((issue) => ({
    title: ISSUE_LABELS[issue.type],
    subtitle: issue.description,
    billed: formatCurrency(result.extractedFields.billedAmount),
    patient: formatCurrency(result.extractedFields.patientResponsibility),
    status: issue.severity === "error" ? "Issue found" : "Needs review",
    issue,
  }))
}

export function AnalysisResultDisplay({ result, progressive }: AnalysisResultProps) {
  const [showActionCenter, setShowActionCenter] = useState(false)
  const reviewRows = useMemo(() => buildReviewRows(result), [result])
  const [selectedIssueIndex, setSelectedIssueIndex] = useState(0)
  const selectedRow = reviewRows[selectedIssueIndex] ?? reviewRows[0]
  const selectedIssue = selectedRow?.issue
  const selectedReasoning = selectedIssue ? ISSUE_REASONING[selectedIssue.type] : null

  const activeStage = showActionCenter ? 3 : result.detectedIssues.length > 0 ? 2 : 1
  const potentialSavings = getPotentialSavings(result)
  const nextAction = result.recommendedActions[0]
  const highlightDetails = [
    {
      label: "Potential savings",
      value: formatCurrency(potentialSavings),
    },
    {
      label: "Issues found",
      value: `${result.detectedIssues.length}`,
    },
    {
      label: "Recommended path",
      value: nextAction ? CATEGORY_LABELS[nextAction.category] : "Review findings",
    },
  ]

  return (
    <div className={cn("space-y-6", progressive && "fade-rise")}>
      <section className="paper-panel p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-[42rem]">
            <div className="eyebrow">Case review</div>
            <h2 className="display-md mt-4 text-balance">
              {result.extractedFields.provider || "Your claim review is ready."}
            </h2>
            <p className="body-copy mt-5">
              {result.explanation || "We translated the uploaded documents into a clearer review of what may need attention."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="status-chip stone">Case {result.caseId.slice(0, 8)}</span>
              <span className="status-chip teal">Analyzed {formatDateTime(result.analyzedAt)}</span>
              {result.detectedIssues.length > 0 ? (
                <span className="status-chip coral">{result.detectedIssues.length} issues surfaced</span>
              ) : (
                <span className="status-chip stone">No issues detected</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" size="lg">
              <Link href={`/action/email?caseId=${encodeURIComponent(result.caseId)}`} target="_blank" rel="noreferrer">
                Open email composer
                <Mail className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" onClick={() => setShowActionCenter((current) => !current)}>
              {showActionCenter ? "Hide action center" : "Prepare next steps"}
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {highlightDetails.map((item) => (
            <div
              key={item.label}
              className="rounded-[1.4rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_76%,var(--color-stone-100)_24%)] p-4"
            >
              <p className="text-[0.75rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">{item.label}</p>
              <p className="mt-3 text-base font-semibold text-[var(--color-ink-900)]">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[14rem_minmax(0,1fr)_20rem]">
        <aside className="paper-panel h-fit p-5 xl:sticky xl:top-28">
          <div className="eyebrow">Claim timeline</div>
          <div className="mt-5 space-y-3">
            {timelineStages.map((stage, index) => {
              const done = index < activeStage
              const current = index === activeStage

              return (
                <div key={stage} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border text-[0.72rem]",
                        done || current
                          ? "border-[var(--color-teal-500)] bg-[var(--color-teal-500)] text-white"
                          : "border-[var(--color-stone-200)] bg-[var(--color-white)] text-[var(--color-ink-500)]"
                      )}
                    >
                      {done ? <CircleCheckBig className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    {index < timelineStages.length - 1 ? (
                      <span className={cn("mt-2 h-9 w-px", done ? "bg-[var(--color-teal-500)]" : "bg-[var(--color-stone-200)]")} />
                    ) : null}
                  </div>
                  <div className="pt-0.5">
                    <p className={current ? "text-sm font-semibold text-[var(--color-ink-900)]" : "text-sm text-[var(--color-ink-700)]"}>
                      {stage}
                    </p>
                    {current ? <p className="mt-1 text-[0.82rem] text-[var(--color-teal-700)]">Current stage</p> : null}
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        <div className="space-y-6">
          <section className="paper-panel overflow-hidden">
            <div className="border-b border-[var(--color-stone-200)] px-5 py-4 md:px-6">
              <div className="eyebrow">Charge review</div>
              <h3 className="section-title mt-3 text-[1.55rem]">A guided table of what the case needs you to understand first.</h3>
            </div>

            <div className="hidden grid-cols-[minmax(0,1.75fr)_0.7fr_0.8fr_0.9fr] gap-3 border-b border-[var(--color-stone-200)] px-5 py-3 text-[0.72rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)] md:grid">
              <span>Charge</span>
              <span>Billed</span>
              <span>Patient</span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-[var(--color-stone-200)]">
              {reviewRows.map((row, index) => {
                const active = index === selectedIssueIndex

                return (
                  <button
                    key={`${row.title}-${index}`}
                    type="button"
                    onClick={() => setSelectedIssueIndex(index)}
                    className={cn(
                      "block w-full px-5 py-4 text-left transition-colors md:px-6",
                      active
                        ? "bg-[color-mix(in_srgb,var(--color-sage-100)_48%,var(--color-white)_52%)]"
                        : "hover:bg-[color-mix(in_srgb,var(--color-stone-100)_58%,var(--color-white)_42%)]"
                    )}
                  >
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1.75fr)_0.7fr_0.8fr_0.9fr] md:items-start">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-ink-900)]">{row.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-ink-700)]">{row.subtitle}</p>
                        <p className="mt-2 text-[0.82rem] text-[var(--color-ink-500)]">Service date {formatDate(result.extractedFields.serviceDate)}</p>
                      </div>
                      <div className="text-sm text-[var(--color-ink-700)] md:pt-0.5">{row.billed}</div>
                      <div className="text-sm text-[var(--color-ink-700)] md:pt-0.5">{row.patient}</div>
                      <div className="md:pt-0.5">
                        <span className={row.status === "Issue found" ? "status-chip coral" : row.status === "Needs review" ? "status-chip stone" : "status-chip teal"}>
                          {row.status}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
            <div className="paper-panel p-6 md:p-7">
              <div className="eyebrow">Recommended actions</div>
              <div className="mt-4 space-y-4">
                {result.recommendedActions.length > 0 ? (
                  result.recommendedActions.map((action, index) => (
                    <div
                      key={`${action.category}-${index}`}
                      className="rounded-[1.35rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_76%,var(--color-stone-100)_24%)] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--color-ink-900)]">{CATEGORY_LABELS[action.category]}</p>
                        <span className="status-chip teal">Step {index + 1}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--color-ink-700)]">{action.action}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.35rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_76%,var(--color-stone-100)_24%)] p-4 text-sm text-[var(--color-ink-700)]">
                    No specific actions were generated for this case.
                  </div>
                )}
              </div>
            </div>

            <div className="paper-panel p-6 md:p-7">
              <div className="eyebrow">Case details</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Provider" value={result.extractedFields.provider} />
                <Field label="Insurer" value={result.extractedFields.insurer} />
                <Field label="Service date" value={formatDate(result.extractedFields.serviceDate)} />
                <Field label="Claim number" value={result.extractedFields.claimNumber} />
                <Field label="Member ID" value={result.extractedFields.memberID} />
                <Field label="Patient responsibility" value={formatCurrency(result.extractedFields.patientResponsibility)} />
              </div>

              {result.extractedFields.cptCodes.length > 0 ? (
                <div className="mt-5">
                  <p className="text-[0.75rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">CPT codes</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.extractedFields.cptCodes.map((code) => (
                      <span
                        key={code}
                        className="rounded-full border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_74%,var(--color-stone-100)_26%)] px-3 py-1 text-sm text-[var(--color-ink-700)]"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="sage-panel h-fit p-6 xl:sticky xl:top-28">
          <div className="eyebrow">Explanation panel</div>
          <h3 className="section-title mt-3 text-[1.55rem]">
            {selectedIssue ? ISSUE_LABELS[selectedIssue.type] : "No major issues were found."}
          </h3>
          <p className="mt-4 text-sm leading-6 text-[var(--color-ink-700)]">
            {selectedReasoning?.summary || result.explanation || "The uploaded documents did not surface a specific billing issue."}
          </p>

          <div className="mt-6 space-y-4">
            <InfoLine icon={Clock3} text={`Reviewed ${formatDateTime(result.analyzedAt)}`} />
            <InfoLine icon={FileText} text={`Provider bill and insurer response compared`} />
            <InfoLine icon={ShieldCheck} text={`You can review all drafts before anything is used`} />
          </div>

          {selectedReasoning ? (
            <>
              <div className="mt-6">
                <p className="text-[0.75rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">Evidence notes</p>
                <ul className="mt-3 space-y-3">
                  {selectedReasoning.evidence.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-[var(--color-ink-700)]">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--color-coral-400)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 rounded-[1.35rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_64%,var(--color-stone-100)_36%)] p-4">
                <p className="text-sm font-semibold text-[var(--color-ink-900)]">Recommended claim action</p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-ink-700)]">{selectedReasoning.next}</p>
              </div>
            </>
          ) : null}
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        {result.laws.length > 0 ? (
          <div className="paper-panel p-6 md:p-7">
            <div className="flex items-center gap-2 text-[var(--color-ink-900)]">
              <Scale className="h-4 w-4 text-[var(--color-teal-700)]" />
              <div className="eyebrow !text-[var(--color-teal-700)]">Relevant legal protections</div>
            </div>
            <div className="mt-5 space-y-4">
              {result.laws.map((law) => (
                <div
                  key={law.title}
                  className="rounded-[1.35rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_76%,var(--color-stone-100)_24%)] p-4"
                >
                  <p className="text-sm font-semibold text-[var(--color-ink-900)]">{law.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-ink-700)]">{law.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="paper-panel p-6 md:p-7">
            <div className="eyebrow">Case context</div>
            <h3 className="section-title mt-3 text-[1.55rem]">This review is ready for the communication step.</h3>
            <p className="mt-4 text-sm leading-6 text-[var(--color-ink-700)]">
              Use the email composer or the action center to draft outreach, gather missing details, and move the case into a more formal dispute path.
            </p>
          </div>
        )}

        <div className="sage-panel p-6">
          <div className="eyebrow">Next moves</div>
          <div className="mt-4 space-y-4">
            <ActionLink
              href={`/action/email?caseId=${encodeURIComponent(result.caseId)}`}
              label="Draft provider or insurer email"
              detail="Open the composer with this case ready to review."
              icon={Mail}
              external
            />
            <ActionButton
              onClick={() => setShowActionCenter((current) => !current)}
              label={showActionCenter ? "Hide action center" : "Open action center"}
              detail="Generate appeal drafts, call briefs, and guided outreach payloads."
              icon={Phone}
            />
            <ActionLink
              href={`/analysis/${result.caseId}`}
              label="Open full case page"
              detail="Return to this case from the dashboard later."
              icon={Landmark}
            />
          </div>
        </div>
      </section>

      {showActionCenter ? (
        <section className="paper-panel p-4 md:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow">Action center</div>
              <h3 className="section-title mt-3 text-[1.6rem]">Draft the next communication with the case details already in place.</h3>
            </div>
            <span className="status-chip teal">
              <Sparkles className="h-3.5 w-3.5" />
              Drafts stay reviewable
            </span>
          </div>
          <ActionCenter key={result.caseId} analysis={result} onClose={() => setShowActionCenter(false)} />
        </section>
      ) : null}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-[1.15rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_72%,var(--color-stone-100)_28%)] p-4">
      <p className="text-[0.75rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--color-ink-900)]">{value || "Not available"}</p>
    </div>
  )
}

function InfoLine({
  icon: Icon,
  text,
}: {
  icon: typeof Clock3
  text: string
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-[var(--color-ink-700)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-white)_42%,var(--color-sage-100)_58%)] text-[var(--color-teal-700)]">
        <Icon className="h-4 w-4" />
      </div>
      <span>{text}</span>
    </div>
  )
}

function ActionLink({
  href,
  label,
  detail,
  icon: Icon,
  external,
}: {
  href: string
  label: string
  detail: string
  icon: typeof Mail
  external?: boolean
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="block rounded-[1.35rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_62%,var(--color-stone-100)_38%)] p-4 transition-colors hover:bg-[color-mix(in_srgb,var(--color-white)_48%,var(--color-sage-100)_52%)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-white)_34%,var(--color-sage-100)_66%)] text-[var(--color-teal-700)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-ink-900)]">{label}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-ink-700)]">{detail}</p>
          <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-teal-700)]">
            Continue
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  )
}

function ActionButton({
  onClick,
  label,
  detail,
  icon: Icon,
}: {
  onClick: () => void
  label: string
  detail: string
  icon: typeof Phone
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[1.35rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_62%,var(--color-stone-100)_38%)] p-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-white)_48%,var(--color-sage-100)_52%)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-white)_34%,var(--color-sage-100)_66%)] text-[var(--color-teal-700)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-ink-900)]">{label}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-ink-700)]">{detail}</p>
          <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-teal-700)]">
            Continue
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </button>
  )
}
