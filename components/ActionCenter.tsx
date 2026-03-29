"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { AnalysisResult } from "@/types/analysis"
import type {
  OutreachBrief,
  ContactTarget,
  EmailDraftResponse,
  CallBriefResponse,
  ElevenLabsCallPayload,
  EmailDraftType,
} from "@/types/outreach"

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "plan" | "provider_email" | "insurer_email" | "call_brief" | "elevenlabs"

interface ContactInfoOverrides {
  [targetId: string]: {
    toEmail?: string
    toNumber?: string
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded border border-[var(--border)] bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="flex-1 text-sm text-red-700">{message}</p>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
      <svg className="h-4 w-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label}
    </div>
  )
}

function CitationList({ citations }: { citations: string[] }) {
  if (citations.length === 0) return null
  return (
    <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700">Citations Used</p>
      <ul className="space-y-0.5">
        {citations.map((c, i) => (
          <li key={i} className="text-xs text-blue-800">
            {c}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MissingFieldsWarning({ fields }: { fields: string[] }) {
  if (fields.length === 0) return null
  return (
    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
        Missing Information
      </p>
      <p className="text-xs text-amber-800">
        The following fields were unavailable and marked as placeholders:{" "}
        <span className="font-medium">{fields.join(", ")}</span>
      </p>
    </div>
  )
}

function NoGroundingWarning() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
      <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="text-xs text-amber-800">
        <span className="font-semibold">No grounded legal citations available.</span> Content is conservative — no legal threats are made.
      </p>
    </div>
  )
}

// ── Tab: Outreach Plan ────────────────────────────────────────────────────────

function OutreachPlanTab({
  brief,
  overrides,
  onOverrideChange,
}: {
  brief: OutreachBrief
  overrides: ContactInfoOverrides
  onOverrideChange: (targetId: string, field: "toEmail" | "toNumber", value: string) => void
}) {
  const hasGrounding = brief.legalGrounding.some((g) => g.confidence === "grounded")

  return (
    <div className="space-y-4">
      {/* Patient & Document Context */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Patient Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ContextRow label="Name" value={brief.patientContext.fullName} />
            <ContextRow label="Member ID" value={brief.patientContext.memberID} />
            <ContextRow label="Claim #" value={brief.patientContext.claimNumber} />
            <ContextRow label="Account #" value={brief.patientContext.accountNumber} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Document Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ContextRow label="Service Date" value={brief.documentContext.serviceDate} />
            <ContextRow label="Bill Date" value={brief.documentContext.billIssueDate} />
            <ContextRow label="Location" value={brief.documentContext.locationOfCare} />
          </CardContent>
        </Card>
      </div>

      {/* Contact Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Contact Targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {brief.contactTargets.map((target) => (
            <ContactTargetCard
              key={target.id}
              target={target}
              override={overrides[target.id] ?? {}}
              onOverrideChange={(field, value) => onOverrideChange(target.id, field, value)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Requested Resolution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Requested Resolution</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1.5">
            {brief.requestedResolution.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Legal Grounding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            Legal Grounding
            {!hasGrounding && <Badge variant="warning">No grounded citations</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasGrounding && <NoGroundingWarning />}
          {brief.legalGrounding.length > 0 && (
            <div className="mt-3 space-y-3">
              {brief.legalGrounding.map((entry) => (
                <div key={entry.id} className="rounded-md border border-[var(--border)] p-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <Badge
                      variant={entry.confidence === "grounded" ? "secondary" : "warning"}
                      className="shrink-0"
                    >
                      {entry.confidence === "grounded" ? "Grounded" : "Needs Review"}
                    </Badge>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {entry.jurisdiction}
                    </Badge>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {entry.priority} priority
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-700">{entry.citation}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{entry.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{entry.whyItApplies}</p>
                  {entry.sourceUrl && (
                    <a
                      href={entry.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-xs text-blue-600 hover:underline"
                    >
                      {entry.sourceUrl}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {brief.missingFields.length > 0 && (
        <MissingFieldsWarning fields={brief.missingFields} />
      )}
    </div>
  )
}

function ContextRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </span>
      <p className={`text-sm ${value ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
        {value ?? "—"}
      </p>
    </div>
  )
}

function ContactTargetCard({
  target,
  override,
  onOverrideChange,
}: {
  target: ContactTarget
  override: { toEmail?: string; toNumber?: string }
  onOverrideChange: (field: "toEmail" | "toNumber", value: string) => void
}) {
  const audienceColor =
    target.audience === "provider" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"

  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${audienceColor}`}>
          {target.audience}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {target.department}
        </span>
        {target.source === "needs_review" && (
          <Badge variant="warning">Needs Review</Badge>
        )}
      </div>
      <p className="text-sm font-medium text-slate-900">{target.organizationName}</p>
      {target.notes && <p className="mt-0.5 text-xs text-slate-500">{target.notes}</p>}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">Email</label>
          <input
            type="email"
            placeholder={target.toEmail ?? "Enter email address"}
            value={override.toEmail ?? target.toEmail ?? ""}
            onChange={(e) => onOverrideChange("toEmail", e.target.value)}
            className="mt-0.5 w-full rounded border border-[var(--border)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Phone</label>
          <input
            type="tel"
            placeholder={target.toNumber ?? "Enter phone number"}
            value={override.toNumber ?? target.toNumber ?? ""}
            onChange={(e) => onOverrideChange("toNumber", e.target.value)}
            className="mt-0.5 w-full rounded border border-[var(--border)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>
    </div>
  )
}

// ── Tab: Email Draft ──────────────────────────────────────────────────────────

function EmailDraftTab({
  brief,
  overrides,
  draftType,
  draft,
  loading,
  error,
  onGenerate,
  onDismissError,
}: {
  brief: OutreachBrief
  overrides: ContactInfoOverrides
  draftType: EmailDraftType
  draft: EmailDraftResponse | null
  loading: boolean
  error: string | null
  onGenerate: (targetId: string) => void
  onDismissError: () => void
}) {
  const audience = draftType === "provider_dispute" ? "provider" : "insurer"
  const target = brief.contactTargets.find((t) => t.audience === audience)

  if (!target) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-slate-500">
        No {audience} contact target found in the outreach plan.
      </div>
    )
  }

  const effectiveEmail = overrides[target.id]?.toEmail ?? target.toEmail

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={onDismissError} />}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">
            {draftType === "provider_dispute" ? "Provider Dispute Letter" : "Insurance Appeal Letter"}
          </p>
          <p className="text-xs text-slate-500">
            To: {target.organizationName} — {target.department}
            {effectiveEmail ? ` <${effectiveEmail}>` : " (no email on file)"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => onGenerate(target.id)}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? (
            <>
              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating…
            </>
          ) : draft ? (
            "Regenerate"
          ) : (
            "Generate Draft"
          )}
        </Button>
      </div>

      {loading && <LoadingSpinner label="Drafting letter via AI…" />}

      {draft && !loading && (
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</p>
              <CopyButton text={draft.subject} />
            </div>
            <p className="text-sm font-medium text-slate-900">{draft.subject}</p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Body</p>
              <CopyButton text={draft.body} />
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{draft.body}</pre>
          </div>

          {draft.attachmentsToMention.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Suggested Attachments
              </p>
              <ul className="space-y-0.5">
                {draft.attachmentsToMention.map((a, i) => (
                  <li key={i} className="text-xs text-slate-700">
                    • {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <CitationList citations={draft.citationsUsed} />
          <MissingFieldsWarning fields={draft.missingFields} />
        </div>
      )}
    </div>
  )
}

// ── Tab: Call Brief ───────────────────────────────────────────────────────────

function CallBriefTab({
  brief,
  overrides,
  callBrief,
  loading,
  error,
  onGenerate,
  onDismissError,
}: {
  brief: OutreachBrief
  overrides: ContactInfoOverrides
  callBrief: CallBriefResponse | null
  loading: boolean
  error: string | null
  onGenerate: (targetId: string) => void
  onDismissError: () => void
}) {
  // Prefer provider target for calls; fall back to first target
  const target =
    brief.contactTargets.find((t) => t.audience === "provider") ??
    brief.contactTargets[0] ??
    null

  if (!target) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-slate-500">
        No contact target found in the outreach plan.
      </div>
    )
  }

  const effectivePhone = overrides[target.id]?.toNumber ?? target.toNumber

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={onDismissError} />}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Phone Call Brief</p>
          <p className="text-xs text-slate-500">
            Calling: {target.organizationName} — {target.department}
            {effectivePhone ? ` · ${effectivePhone}` : " (no phone on file)"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => onGenerate(target.id)}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? (
            <>
              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating…
            </>
          ) : callBrief ? (
            "Regenerate"
          ) : (
            "Generate Call Brief"
          )}
        </Button>
      </div>

      {loading && <LoadingSpinner label="Generating call brief via AI…" />}

      {callBrief && !loading && (
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opening Script</p>
              <CopyButton text={callBrief.openingScript} />
            </div>
            <p className="text-sm leading-relaxed text-slate-800">{callBrief.openingScript}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ScriptSection title="Must Say" items={callBrief.mustSay} color="blue" />
            {callBrief.legalPoints.length > 0 && (
              <ScriptSection title="Legal Points" items={callBrief.legalPoints} color="purple" />
            )}
            <ScriptSection title="Escalation Path" items={callBrief.escalationPath} color="amber" />
            {callBrief.prohibitedClaims.length > 0 && (
              <ScriptSection title="Do NOT Say" items={callBrief.prohibitedClaims} color="red" />
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Reference Numbers
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Member ID</span>
                <p className="font-mono font-medium">{callBrief.referenceNumbers.memberID ?? "—"}</p>
              </div>
              <div>
                <span className="text-slate-500">Claim #</span>
                <p className="font-mono font-medium">{callBrief.referenceNumbers.claimNumber ?? "—"}</p>
              </div>
              <div>
                <span className="text-slate-500">Account #</span>
                <p className="font-mono font-medium">{callBrief.referenceNumbers.accountNumber ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScriptSection({
  title,
  items,
  color,
}: {
  title: string
  items: string[]
  color: "blue" | "purple" | "amber" | "red"
}) {
  const colorMap = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    purple: "border-purple-100 bg-purple-50 text-purple-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    red: "border-red-100 bg-red-50 text-red-700",
  }
  return (
    <div className={`rounded-md border px-3 py-2 ${colorMap[color]}`}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide">{title}</p>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Tab: ElevenLabs Payload ───────────────────────────────────────────────────

function ElevenLabsTab({
  brief,
  callBrief,
  payload,
  loading,
  error,
  onGenerate,
  onDismissError,
}: {
  brief: OutreachBrief
  callBrief: CallBriefResponse | null
  payload: ElevenLabsCallPayload | null
  loading: boolean
  error: string | null
  onGenerate: (targetId: string) => void
  onDismissError: () => void
}) {
  const target =
    brief.contactTargets.find((t) => t.audience === "provider") ??
    brief.contactTargets[0] ??
    null

  if (!callBrief) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-slate-500">
        Generate a Call Brief first — the ElevenLabs payload is built from it.
      </div>
    )
  }

  if (!target) return null

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={onDismissError} />}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">ElevenLabs Conversation Config</p>
          <p className="text-xs text-slate-500">
            {payload
              ? `Mode: ${payload.mode} · Generated ${new Date(payload.generatedAt).toLocaleTimeString()}`
              : "Builds a normalized payload from the call brief"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => onGenerate(target.id)}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? (
            <>
              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Building…
            </>
          ) : payload ? (
            "Rebuild"
          ) : (
            "Build Payload"
          )}
        </Button>
      </div>

      {loading && <LoadingSpinner label="Building ElevenLabs payload…" />}

      {payload && !loading && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={payload.mode === "conversation_config" ? "secondary" : "outline"}
              className="text-xs"
            >
              {payload.mode === "conversation_config" ? "Live Config" : "Preview Mode"}
            </Badge>
            {payload.mode === "preview" && (
              <span className="text-xs text-slate-500">
                Set ELEVENLABS_API_KEY to enable live config mode
              </span>
            )}
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                First Message
              </p>
              <CopyButton text={payload.conversation.firstMessage} />
            </div>
            <p className="text-sm leading-relaxed text-slate-800">{payload.conversation.firstMessage}</p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                System Prompt
              </p>
              <CopyButton text={payload.conversation.systemPrompt} />
            </div>
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
              {payload.conversation.systemPrompt}
            </pre>
          </div>

          {Object.keys(payload.conversation.dynamicVariables).length > 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dynamic Variables
                </p>
                <CopyButton
                  text={JSON.stringify(payload.conversation.dynamicVariables, null, 2)}
                />
              </div>
              <div className="space-y-1">
                {Object.entries(payload.conversation.dynamicVariables).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="w-40 shrink-0 font-mono font-medium text-slate-600">{k}</span>
                    <span className="truncate text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-[var(--border)] bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Full JSON Payload
              </p>
              <CopyButton text={JSON.stringify(payload, null, 2)} />
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>

          <CitationList citations={payload.citationsUsed} />
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ActionCenterProps {
  analysis: AnalysisResult
  onClose: () => void
}

export function ActionCenter({ analysis, onClose }: ActionCenterProps) {
  const [activeTab, setActiveTab] = useState<Tab>("plan")

  // Outreach plan
  const [brief, setBrief] = useState<OutreachBrief | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  // Contact info overrides (user-entered email/phone)
  const [overrides, setOverrides] = useState<ContactInfoOverrides>({})

  // Email drafts
  const [providerDraft, setProviderDraft] = useState<EmailDraftResponse | null>(null)
  const [providerDraftLoading, setProviderDraftLoading] = useState(false)
  const [providerDraftError, setProviderDraftError] = useState<string | null>(null)

  const [insurerDraft, setInsurerDraft] = useState<EmailDraftResponse | null>(null)
  const [insurerDraftLoading, setInsurerDraftLoading] = useState(false)
  const [insurerDraftError, setInsurerDraftError] = useState<string | null>(null)

  // Call brief
  const [callBrief, setCallBrief] = useState<CallBriefResponse | null>(null)
  const [callBriefLoading, setCallBriefLoading] = useState(false)
  const [callBriefError, setCallBriefError] = useState<string | null>(null)

  // ElevenLabs payload
  const [elevenLabsPayload, setElevenLabsPayload] = useState<ElevenLabsCallPayload | null>(null)
  const [elevenLabsLoading, setElevenLabsLoading] = useState(false)
  const [elevenLabsError, setElevenLabsError] = useState<string | null>(null)

  // ── Fetch outreach plan ──────────────────────────────────────────────────────

  const fetchPlan = useCallback(async () => {
    setPlanLoading(true)
    setPlanError(null)
    try {
      const res = await fetch("/api/outreach/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate outreach plan")
      setBrief(data as OutreachBrief)
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : String(err))
    } finally {
      setPlanLoading(false)
    }
  }, [analysis])

  // Fetch plan on mount
  useEffect(() => {
    fetchPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Override handler ─────────────────────────────────────────────────────────

  const handleOverrideChange = useCallback(
    (targetId: string, field: "toEmail" | "toNumber", value: string) => {
      setOverrides((prev) => ({
        ...prev,
        [targetId]: { ...prev[targetId], [field]: value },
      }))
    },
    []
  )

  // Apply overrides to brief before passing to generators
  const briefWithOverrides = brief
    ? {
        ...brief,
        contactTargets: brief.contactTargets.map((t) => ({
          ...t,
          toEmail: overrides[t.id]?.toEmail ?? t.toEmail,
          toNumber: overrides[t.id]?.toNumber ?? t.toNumber,
        })),
      }
    : null

  // ── Email draft handlers ─────────────────────────────────────────────────────

  const generateProviderDraft = useCallback(
    async (targetId: string) => {
      if (!briefWithOverrides) return
      setProviderDraftLoading(true)
      setProviderDraftError(null)
      try {
        const res = await fetch("/api/outreach/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outreachBrief: briefWithOverrides,
            targetId,
            draftType: "provider_dispute",
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to generate provider draft")
        setProviderDraft(data as EmailDraftResponse)
      } catch (err) {
        setProviderDraftError(err instanceof Error ? err.message : String(err))
      } finally {
        setProviderDraftLoading(false)
      }
    },
    [briefWithOverrides]
  )

  const generateInsurerDraft = useCallback(
    async (targetId: string) => {
      if (!briefWithOverrides) return
      setInsurerDraftLoading(true)
      setInsurerDraftError(null)
      try {
        const res = await fetch("/api/outreach/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outreachBrief: briefWithOverrides,
            targetId,
            draftType: "insurance_appeal",
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to generate insurer draft")
        setInsurerDraft(data as EmailDraftResponse)
      } catch (err) {
        setInsurerDraftError(err instanceof Error ? err.message : String(err))
      } finally {
        setInsurerDraftLoading(false)
      }
    },
    [briefWithOverrides]
  )

  // ── Call brief handler ───────────────────────────────────────────────────────

  const generateCallBrief = useCallback(
    async (targetId: string) => {
      if (!briefWithOverrides) return
      setCallBriefLoading(true)
      setCallBriefError(null)
      try {
        const res = await fetch("/api/outreach/call-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outreachBrief: briefWithOverrides, targetId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to generate call brief")
        setCallBrief(data as CallBriefResponse)
      } catch (err) {
        setCallBriefError(err instanceof Error ? err.message : String(err))
      } finally {
        setCallBriefLoading(false)
      }
    },
    [briefWithOverrides]
  )

  // ── ElevenLabs handler ───────────────────────────────────────────────────────

  const generateElevenLabsPayload = useCallback(
    async (targetId: string) => {
      if (!briefWithOverrides || !callBrief) return
      setElevenLabsLoading(true)
      setElevenLabsError(null)
      try {
        const res = await fetch("/api/outreach/elevenlabs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outreachBrief: briefWithOverrides,
            callBrief,
            targetId,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to build ElevenLabs payload")
        setElevenLabsPayload(data as ElevenLabsCallPayload)
      } catch (err) {
        setElevenLabsError(err instanceof Error ? err.message : String(err))
      } finally {
        setElevenLabsLoading(false)
      }
    },
    [briefWithOverrides, callBrief]
  )

  // ── Tabs config ──────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; badge?: string }[] = [
    { id: "plan", label: "Outreach Plan" },
    { id: "provider_email", label: "Provider Email" },
    { id: "insurer_email", label: "Insurance Appeal" },
    { id: "call_brief", label: "Call Brief" },
    { id: "elevenlabs", label: "ElevenLabs", badge: callBrief ? undefined : "needs call brief" },
  ]

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <LightningIcon />
          <div>
            <p className="text-sm font-semibold text-blue-900">Action Center</p>
            <p className="text-xs text-blue-700">Case {analysis.caseId.slice(0, 8)}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-blue-500 hover:text-blue-700"
          aria-label="Close Action Center"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Plan loading / error */}
      {planLoading && <LoadingSpinner label="Generating outreach plan…" />}
      {planError && (
        <ErrorBanner message={`Outreach plan failed: ${planError}`} onDismiss={() => setPlanError(null)} />
      )}

      {brief && (
        <>
          {/* Tab bar */}
          <div className="flex flex-wrap gap-1 border-b border-[var(--border)] pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-t-md px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border border-b-white border-[var(--border)] bg-white text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="min-h-48">
            {activeTab === "plan" && (
              <OutreachPlanTab
                brief={brief}
                overrides={overrides}
                onOverrideChange={handleOverrideChange}
              />
            )}

            {activeTab === "provider_email" && briefWithOverrides && (
              <EmailDraftTab
                brief={briefWithOverrides}
                overrides={overrides}
                draftType="provider_dispute"
                draft={providerDraft}
                loading={providerDraftLoading}
                error={providerDraftError}
                onGenerate={generateProviderDraft}
                onDismissError={() => setProviderDraftError(null)}
              />
            )}

            {activeTab === "insurer_email" && briefWithOverrides && (
              <EmailDraftTab
                brief={briefWithOverrides}
                overrides={overrides}
                draftType="insurance_appeal"
                draft={insurerDraft}
                loading={insurerDraftLoading}
                error={insurerDraftError}
                onGenerate={generateInsurerDraft}
                onDismissError={() => setInsurerDraftError(null)}
              />
            )}

            {activeTab === "call_brief" && briefWithOverrides && (
              <CallBriefTab
                brief={briefWithOverrides}
                overrides={overrides}
                callBrief={callBrief}
                loading={callBriefLoading}
                error={callBriefError}
                onGenerate={generateCallBrief}
                onDismissError={() => setCallBriefError(null)}
              />
            )}

            {activeTab === "elevenlabs" && briefWithOverrides && (
              <ElevenLabsTab
                brief={briefWithOverrides}
                callBrief={callBrief}
                payload={elevenLabsPayload}
                loading={elevenLabsLoading}
                error={elevenLabsError}
                onGenerate={generateElevenLabsPayload}
                onDismissError={() => setElevenLabsError(null)}
              />
            )}
          </div>

          <Separator />
          <p className="text-xs text-[var(--muted-foreground)]">
            All content is generated for review only. No emails are sent or calls placed from this interface.
          </p>
        </>
      )}
    </div>
  )
}

function LightningIcon() {
  return (
    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}
