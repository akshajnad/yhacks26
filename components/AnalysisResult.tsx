"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  AnalysisResult,
  ActionCategory,
  IssueSeverity,
  IssueType,
} from "@/types/analysis";

interface AnalysisResultProps {
  result: AnalysisResult;
  progressive?: boolean;
}

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  contact_provider: "Contact Provider Billing",
  file_appeal: "File Insurance Appeal",
  legal_protection: "Use Legal Protection",
  dispute_self_pay: "Dispute Self-Pay Balance",
};

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  contact_provider: "bg-blue-50 text-blue-800 border-blue-200",
  file_appeal: "bg-slate-100 text-slate-800 border-slate-300",
  legal_protection: "bg-red-50 text-red-800 border-red-200",
  dispute_self_pay: "bg-amber-50 text-amber-800 border-amber-200",
};

const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  BILL_EOB_MISMATCH: "Bill vs EOB mismatch",
  OVERCHARGE: "Potential overcharge",
  DENIAL_FLAG: "Claim denial flag",
  NO_SURPRISES_ACT_TRIGGER: "No Surprises Act trigger",
  DUPLICATE_CHARGE: "Duplicate charge",
  UPCODING: "Possible upcoding",
  BALANCE_BILLING: "Balance billing risk",
};

const ISSUE_REASONING: Record<IssueType, { why: string; next: string }> = {
  BILL_EOB_MISMATCH: {
    why: "Patient responsibility on the bill appears inconsistent with insurer adjudication.",
    next: "Request corrected line-item responsibility from provider billing.",
  },
  OVERCHARGE: {
    why: "Charged amount appears higher than expected for documented services.",
    next: "Request coded line-item breakdown and negotiated rate validation.",
  },
  DENIAL_FLAG: {
    why: "A denial can shift cost burden to the patient if unresolved.",
    next: "File an insurer appeal with supporting documentation.",
  },
  NO_SURPRISES_ACT_TRIGGER: {
    why: "This may qualify for federal surprise-billing protections.",
    next: "Initiate a No Surprises Act dispute pathway.",
  },
  DUPLICATE_CHARGE: {
    why: "Duplicate billing can inflate out-of-pocket responsibility.",
    next: "Dispute repeated CPT/service lines with provider billing.",
  },
  UPCODING: {
    why: "Service coding level may exceed documented care complexity.",
    next: "Request coding review with clinical documentation support.",
  },
  BALANCE_BILLING: {
    why: "Balance billing may be improper depending on plan/network context.",
    next: "Ask provider to pause collections while billing status is reviewed.",
  },
};

type BillingStage = "provider" | "insurance" | "patient";

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return value;
}

function getPotentialSavings(result: AnalysisResult): number | null {
  const patientResponsibility = result.extractedFields.patientResponsibility;
  if (typeof patientResponsibility === "number" && patientResponsibility > 0)
    return patientResponsibility;

  const billedAmount = result.extractedFields.billedAmount;
  const insurerPaid = result.extractedFields.insurerPaid;

  if (typeof billedAmount === "number" && typeof insurerPaid === "number") {
    const delta = billedAmount - insurerPaid;
    return delta > 0 ? delta : null;
  }

  return null;
}

function issueStage(type: IssueType): BillingStage {
  if (
    type === "DUPLICATE_CHARGE" ||
    type === "UPCODING" ||
    type === "OVERCHARGE"
  )
    return "provider";
  if (type === "DENIAL_FLAG") return "insurance";
  return "patient";
}

function recommendedAction(result: AnalysisResult): string {
  const first = result.recommendedActions[0];
  if (!first) return "Review findings and prepare outreach";
  return CATEGORY_LABELS[first.category];
}

export function AnalysisResultDisplay({
  result,
  progressive = false,
}: AnalysisResultProps) {
  const caseId = result.caseId ?? "unknown";
  const analyzedAt = result.analyzedAt ?? new Date().toISOString();
  const explanation = result.explanation ?? "No explanation provided.";
  const detectedIssues = result.detectedIssues ?? [];
  const recommendedActions = result.recommendedActions ?? [];
  const ef = result.extractedFields;
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
  };

  const errorCount = detectedIssues.filter(
    (i) => i.severity === "error",
  ).length;
  const warningCount = detectedIssues.filter(
    (i) => i.severity === "warning",
  ).length;
  const potentialSavings = getPotentialSavings(result);

  const stageTotals: Record<BillingStage, number> = {
    provider: 0,
    insurance: 0,
    patient: 0,
  };
  detectedIssues.forEach((issue) => {
    stageTotals[issueStage(issue.type)] += 1;
  });

  const highlightedStage: BillingStage =
    stageTotals.provider >= stageTotals.insurance &&
    stageTotals.provider >= stageTotals.patient
      ? "provider"
      : stageTotals.insurance >= stageTotals.patient
        ? "insurance"
        : "patient";

  const [revealStage, setRevealStage] = useState(() => (progressive ? 1 : 4));

  useEffect(() => {
    if (!progressive) return;
    const t1 = window.setTimeout(() => setRevealStage(2), 300);
    const t2 = window.setTimeout(() => setRevealStage(3), 700);
    const t3 = window.setTimeout(() => setRevealStage(4), 1100);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [progressive]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
        <SummaryCard
          title="Potential savings"
          value={formatCurrency(potentialSavings)}
          subtext="Estimated recoverable amount based on current findings"
          emphasis
        />
        <SummaryCard
          title="Issues found"
          value={String(detectedIssues.length)}
          subtext={`${errorCount} critical · ${warningCount} warning`}
        />
        <SummaryCard
          title="Recommended action"
          value={recommendedAction(result)}
          subtext="Best next step from current audit results"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Case ID: {caseId}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Analyzed {new Date(analyzedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          {errorCount > 0 && (
            <Badge variant="error">{errorCount} critical</Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="warning">{warningCount} warning</Badge>
          )}
          {detectedIssues.length === 0 && (
            <Badge variant="secondary">No issues detected</Badge>
          )}
        </div>
      </div>

      {revealStage >= 2 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlowIcon />
              Billing flow visualization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
              <FlowNode
                title="Provider Bill"
                count={stageTotals.provider}
                active={highlightedStage === "provider"}
                tone="blue"
              />
              <FlowArrow />
              <FlowNode
                title="Insurance Processing"
                count={stageTotals.insurance}
                active={highlightedStage === "insurance"}
                tone="slate"
              />
              <FlowArrow />
              <FlowNode
                title="Patient Bill"
                count={stageTotals.patient}
                active={highlightedStage === "patient"}
                tone="amber"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {revealStage >= 3 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertIcon />
              Issues detected
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
                  <IssueCard
                    key={i}
                    issue={issue}
                    potentialSavings={potentialSavings}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {revealStage >= 4 ? (
        <>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckIcon />
                Action center
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recommendedActions.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No specific actions recommended.
                </p>
              ) : (
                <ol className="mb-4 space-y-3">
                  {recommendedActions.map((action, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-slate-50 p-3"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                        {i + 1}
                      </span>
                      <div className="flex flex-col gap-2">
                        <span
                          className={`w-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[action.category]}`}
                        >
                          {CATEGORY_LABELS[action.category]}
                        </span>
                        <p className="text-sm text-[var(--foreground)]">
                          {action.action}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <ActionStub
                  title="Provider Dispute Email"
                  description="Draft a concise provider billing dispute with cited findings and requested corrections."
                />
                <ActionStub
                  title="Insurance Appeal Draft"
                  description="Prepare an appeal packet summary aligned with denial or responsibility mismatch findings."
                />
                <ActionStub
                  title="Billing Call Script"
                  description="Generate a call script with key points, questions, and escalation prompts."
                />
              </div>
            </CardContent>
          </Card>

          <details className="rounded-lg border border-[var(--border)] bg-white">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
              Additional case details
            </summary>
            <div className="border-t border-[var(--border)] px-4 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Provider" value={extractedFields.provider} />
                <Field label="Insurer" value={extractedFields.insurer} />
                <Field
                  label="Service Date"
                  value={formatDate(extractedFields.serviceDate)}
                />
                <Field
                  label="Claim Number"
                  value={extractedFields.claimNumber}
                />
                <Field label="Member ID" value={extractedFields.memberID} />
                <Field
                  label="Billed Amount"
                  value={formatCurrency(extractedFields.billedAmount)}
                />
                <Field
                  label="Insurer Paid"
                  value={formatCurrency(extractedFields.insurerPaid)}
                />
                <Field
                  label="Patient Responsibility"
                  value={formatCurrency(extractedFields.patientResponsibility)}
                  isHighlight
                />
              </div>

              {extractedFields.cptCodes.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">
                      CPT Codes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {extractedFields.cptCodes.map((code) => (
                        <Badge
                          key={code}
                          variant="outline"
                          className="font-mono"
                        >
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
                  <Field
                    label="Denial Reason"
                    value={extractedFields.denialReason}
                    isFullWidth
                  />
                </>
              )}

              <Separator className="my-4" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Case explanation
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                {explanation}
              </p>
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtext,
  emphasis = false,
}: {
  title: string;
  value: string;
  subtext: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p
        className={`mt-2 ${emphasis ? "text-3xl" : "text-2xl"} font-semibold tracking-tight text-slate-900`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-600">{subtext}</p>
    </div>
  );
}

function FlowNode({
  title,
  count,
  active,
  tone,
}: {
  title: string;
  count: number;
  active: boolean;
  tone: "blue" | "slate" | "amber";
}) {
  const toneClasses =
    tone === "blue"
      ? "border-blue-200"
      : tone === "amber"
        ? "border-amber-200"
        : "border-slate-300";

  return (
    <div
      className={`rounded-lg border bg-white p-3 ${toneClasses} ${active ? "ring-1 ring-slate-300" : ""}`}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">
        {count} issue{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden items-center justify-center text-slate-400 md:flex">
      →
    </div>
  );
}

function ActionStub({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <Button disabled variant="outline" className="mt-3 w-full">
        Coming soon
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  isHighlight = false,
  isFullWidth = false,
}: {
  label: string;
  value: string | null;
  isHighlight?: boolean;
  isFullWidth?: boolean;
}) {
  return (
    <div className={isFullWidth ? "col-span-full" : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm ${isHighlight ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]"} ${!value ? "text-[var(--muted-foreground)]" : ""}`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

function IssueCard({
  issue,
  potentialSavings,
}: {
  issue: { type: IssueType; severity: IssueSeverity; description: string };
  potentialSavings: number | null;
}) {
  const isError = issue.severity === "error";
  const meta = ISSUE_REASONING[issue.type];

  return (
    <div
      className={`rounded-lg border bg-white p-4 ${isError ? "border-red-200" : "border-amber-200"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Badge variant={isError ? "error" : "warning"}>
          {ISSUE_TYPE_LABELS[issue.type] ?? issue.type}
        </Badge>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {isError ? "Critical" : "Warning"}
        </span>
      </div>
      <p className="mt-3 text-sm text-[var(--foreground)]">
        {issue.description}
      </p>
      <p className="mt-2 text-sm text-slate-700">
        <span className="font-medium">Why it matters:</span> {meta.why}
      </p>
      <p className="mt-1 text-sm text-slate-700">
        <span className="font-medium">Recommended next step:</span> {meta.next}
      </p>
      <p className="mt-1 text-sm text-slate-700">
        <span className="font-medium">Impact estimate:</span>{" "}
        {formatCurrency(potentialSavings)}
      </p>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg
      className="h-5 w-5 text-slate-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 text-slate-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function FlowIcon() {
  return (
    <svg
      className="h-5 w-5 text-slate-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg
      className="h-5 w-5 text-indigo-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
      />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg
      className="h-5 w-5 text-slate-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h7m0 0L8 3m3 3L8 9m9 9h-7m0 0l3-3m-3 3l3 3M4 18h7m2-12h7"
      />
    </svg>
  );
}
