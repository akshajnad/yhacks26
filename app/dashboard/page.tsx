"use client"

import Link from "next/link"
import { useAuth0 } from "@auth0/auth0-react"
import { useMemo, useState, useEffect } from "react"
import { ArrowRight, Clock3, FileText, ShieldCheck } from "lucide-react"
import type { ActionCategory, AnalysisResult } from "@/types/analysis"
import { Button } from "@/components/ui/button"
import { ClaimWorkspacePreview } from "@/components/ClaimWorkspacePreview"
import { supabase } from "@/lib/supabase"

const RECENT_ANALYSES_STORAGE_KEY = "redline.recent-analyses.v1"
const MAX_RECENT_ANALYSES = 5

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  contact_provider: "Contact provider billing",
  file_appeal: "File insurance appeal",
  legal_protection: "Use legal protection",
  dispute_self_pay: "Dispute self-pay balance",
}

function formatCurrency(value: number | null): string {
  if (value === null) return "Not available"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateTime(value?: string | null): string {
  if (!value) return "No analyses yet"
  return new Date(value).toLocaleString()
}

function getPotentialSavings(result: AnalysisResult): number | null {
  const patientResponsibility = result.extractedFields.patientResponsibility
  if (typeof patientResponsibility === "number" && patientResponsibility > 0) return patientResponsibility

  const billedAmount = result.extractedFields.billedAmount
  const insurerPaid = result.extractedFields.insurerPaid
  if (typeof billedAmount === "number" && typeof insurerPaid === "number") {
    const delta = billedAmount - insurerPaid
    return delta > 0 ? delta : null
  }

  return null
}

function getRecommendedAction(result: AnalysisResult): string {
  const first = result.recommendedActions[0]
  if (!first) return "Review findings"
  return CATEGORY_LABELS[first.category]
}

function safelyReadRecentAnalyses(): AnalysisResult[] {
  try {
    const raw = localStorage.getItem(RECENT_ANALYSES_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(
        (item): item is AnalysisResult =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof item.caseId === "string" &&
          typeof item.analyzedAt === "string" &&
          Array.isArray(item.detectedIssues) &&
          Array.isArray(item.recommendedActions) &&
          typeof item.extractedFields === "object"
      )
      .slice(0, MAX_RECENT_ANALYSES)
  } catch {
    return []
  }
}

function getInitialRecentAnalyses(): AnalysisResult[] {
  if (typeof window === "undefined") return []
  return safelyReadRecentAnalyses()
}

export default function DashboardPage() {
  const { user, isLoading, loginWithRedirect } = useAuth0()
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisResult[]>(() => getInitialRecentAnalyses())
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    async function fetchHistory() {
      if (!user?.sub) return

      setFetching(true)
      try {
        const { data } = await supabase.from("user_cases").select("cases").eq("user_id", user.sub).maybeSingle()

        if (data?.cases) {
          const remoteCases = data.cases as AnalysisResult[]
          setRecentAnalyses(remoteCases)
          if (remoteCases.length > 0) {
            setSelectedCaseId((current) => current ?? remoteCases[0].caseId)
          }
        }
      } catch (err) {
        console.error("Failed to fetch history from Supabase:", err)
      } finally {
        setFetching(false)
      }
    }

    if (user) {
      fetchHistory()
    }
  }, [user])

  const recentItems = useMemo(() => recentAnalyses.slice(0, MAX_RECENT_ANALYSES), [recentAnalyses])

  const selectedAnalysis = useMemo(() => {
    if (selectedCaseId) {
      const found = recentItems.find((item) => item.caseId === selectedCaseId)
      if (found) return found
    }
    return recentItems[0] ?? null
  }, [recentItems, selectedCaseId])

  const totalSavings = useMemo(
    () => recentItems.reduce((sum, item) => sum + (getPotentialSavings(item) ?? 0), 0),
    [recentItems]
  )

  const totalIssues = useMemo(
    () => recentItems.reduce((sum, item) => sum + item.detectedIssues.length, 0),
    [recentItems]
  )

  const latestAnalysis = recentItems[0] ?? null

  if (isLoading) {
    return (
      <section className="section-shell">
        <div className="paper-panel p-8">
          <p className="eyebrow">Cases</p>
          <h1 className="section-title mt-4">Loading your workspace.</h1>
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="section-shell">
        <div className="copy-column">
          <p className="eyebrow">Cases</p>
          <h1 className="display-md mt-4 text-balance">Sign in to review saved claims and start a new one.</h1>
          <p className="body-copy mt-5">
            Your case history lives here, including recent reviews, issue summaries, and the next recommended action.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => loginWithRedirect()}>
              Sign in to continue
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">Return home</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div>
      <section className="section-shell pb-10 pt-10 md:pb-12 md:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="copy-column">
            <p className="eyebrow">Cases</p>
            <h1 className="display-md mt-4 text-balance">A calmer record of what was found and what comes next.</h1>
            <p className="body-copy mt-5">
              Keep recent claim reviews in one place, revisit the evidence, and move back into drafting when you are ready.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="status-chip teal">
              <ShieldCheck className="h-3.5 w-3.5" />
              {fetching ? "Refreshing cases" : `${recentItems.length} recent case${recentItems.length === 1 ? "" : "s"}`}
            </div>
            <Button asChild size="lg">
              <Link href="/analysis/new">Start a new claim</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="section-shell pt-0">
        {recentItems.length === 0 ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-center">
            <div className="paper-panel p-8 md:p-10">
              <p className="eyebrow">Your first case</p>
              <h2 className="display-md mt-4 text-balance">Nothing saved yet. Start with the bill and EOB.</h2>
              <p className="body-copy mt-5">
                Most people using this product are new to claims and appeals. The first value is understanding the charge and seeing a trustworthy next step, not learning a complex dashboard.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/analysis/new">Upload documents</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/#process">See how it works</Link>
                </Button>
              </div>
            </div>

            <ClaimWorkspacePreview compact />
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="paper-panel p-5">
                <div className="eyebrow">Overview</div>
                <div className="mt-4 space-y-4">
                  <Metric label="Potential savings reviewed" value={formatCurrency(totalSavings)} />
                  <Metric label="Issues surfaced" value={`${totalIssues}`} />
                  <Metric label="Latest review" value={formatDateTime(latestAnalysis?.analyzedAt)} />
                </div>
              </div>

              <div className="paper-panel overflow-hidden">
                <div className="border-b border-[var(--color-stone-200)] px-5 py-4">
                  <div className="eyebrow">Recent cases</div>
                </div>
                <div className="divide-y divide-[var(--color-stone-200)]">
                  {recentItems.map((item) => {
                    const active = (selectedCaseId ?? recentItems[0]?.caseId) === item.caseId

                    return (
                      <button
                        key={item.caseId}
                        type="button"
                        onClick={() => setSelectedCaseId(item.caseId)}
                        className={active
                          ? "w-full bg-[color-mix(in_srgb,var(--color-sage-100)_56%,var(--color-white)_44%)] px-5 py-4 text-left"
                          : "w-full px-5 py-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-stone-100)_62%,var(--color-white)_38%)]"}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                              {item.extractedFields.provider || "Untitled provider review"}
                            </p>
                            <p className="mt-1 text-sm text-[var(--color-ink-700)]">{formatDateTime(item.analyzedAt)}</p>
                          </div>
                          <span className={item.detectedIssues.length > 0 ? "status-chip coral" : "status-chip stone"}>
                            {item.detectedIssues.length > 0 ? `${item.detectedIssues.length} issues` : "Clear"}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </aside>

            {selectedAnalysis ? (
              <div className="space-y-6">
                <div className="paper-panel p-6 md:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-[40rem]">
                      <div className="eyebrow">Selected case</div>
                      <h2 className="display-md mt-4 text-balance">
                        {selectedAnalysis.extractedFields.provider || "Claim review ready"}
                      </h2>
                      <p className="body-copy mt-5">
                        {selectedAnalysis.explanation || "Review the findings, compare the charges, and continue into the claim workspace."}
                      </p>
                    </div>
                    <Button asChild size="lg">
                      <Link href={`/analysis/${selectedAnalysis.caseId}`}>Open full review</Link>
                    </Button>
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <Highlight label="Potential savings" value={formatCurrency(getPotentialSavings(selectedAnalysis))} />
                    <Highlight label="Recommended path" value={getRecommendedAction(selectedAnalysis)} />
                    <Highlight label="Service date" value={selectedAnalysis.extractedFields.serviceDate || "Not available"} />
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
                  <div className="paper-panel p-6 md:p-8">
                    <div className="eyebrow">Issues found</div>
                    <div className="mt-4 space-y-4">
                      {selectedAnalysis.detectedIssues.length > 0 ? (
                        selectedAnalysis.detectedIssues.map((issue) => (
                          <div
                            key={`${issue.type}-${issue.description}`}
                            className="rounded-[1.35rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_76%,var(--color-stone-100)_24%)] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-[var(--color-ink-900)]">{issue.description}</p>
                              <span className={issue.severity === "error" ? "status-chip coral" : "status-chip stone"}>
                                {issue.severity === "error" ? "Needs attention" : "Review"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-[var(--color-ink-700)]">{issue.type.replaceAll("_", " ").toLowerCase()}</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[1.35rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_76%,var(--color-stone-100)_24%)] p-4 text-sm text-[var(--color-ink-700)]">
                          No issues were detected in this review.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sage-panel p-6">
                    <div className="eyebrow">Next action</div>
                    <h3 className="section-title mt-3 text-[1.45rem]">{getRecommendedAction(selectedAnalysis)}</h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--color-ink-700)]">
                      Reopen the full review when you want to inspect evidence, draft communications, or revisit the claim timeline.
                    </p>
                    <div className="mt-6 space-y-4">
                      <InfoLine icon={Clock3} text={formatDateTime(selectedAnalysis.analyzedAt)} />
                      <InfoLine icon={FileText} text={`${selectedAnalysis.detectedIssues.length} issue${selectedAnalysis.detectedIssues.length === 1 ? "" : "s"} surfaced`} />
                    </div>
                    <Button asChild variant="outline" size="lg" className="mt-6 w-full">
                      <Link href={`/analysis/${selectedAnalysis.caseId}`}>
                        Continue this case
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.75rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">{label}</p>
      <p className="mt-2 font-[family:var(--font-display)] text-[1.8rem] leading-none text-[var(--color-ink-900)]">{value}</p>
    </div>
  )
}

function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_76%,var(--color-stone-100)_24%)] p-4">
      <p className="text-[0.75rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">{label}</p>
      <p className="mt-3 text-base font-semibold text-[var(--color-ink-900)]">{value}</p>
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
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-white)_44%,var(--color-sage-100)_56%)] text-[var(--color-teal-700)]">
        <Icon className="h-4 w-4" />
      </div>
      <span>{text}</span>
    </div>
  )
}
