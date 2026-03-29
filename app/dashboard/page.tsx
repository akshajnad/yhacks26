"use client"

import Link from "next/link"
import { useAuth0 } from "@auth0/auth0-react"
import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { ActionCategory, AnalysisResult } from "@/types/analysis"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Spotlight } from "@/components/ui/spotlight"
import { StackedPanels } from "@/components/ui/stacked-panels"
import { SplineScene } from "@/components/ui/spline-scene"
const RECENT_ANALYSES_STORAGE_KEY = "NIPS.recent-analyses.v1"
const MAX_RECENT_ANALYSES = 5

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  contact_provider: "Contact Provider Billing",
  file_appeal: "File Insurance Appeal",
  legal_protection: "Use Legal Protection",
  dispute_self_pay: "Dispute Self-Pay Balance",
}

function profileValue(value?: string | null) {
  if (!value) return "Not provided"
  return value
}

function formatCurrency(value: number | null): string {
  if (value === null) return "-"
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
  const { user, isLoading, loginWithRedirect, logout } = useAuth0()
  const router = useRouter()
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisResult[]>(() => getInitialRecentAnalyses())
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)

  // Fetch from Supabase on load
  useEffect(() => {
    async function fetchHistory() {
      if (!user?.sub) return

      setFetching(true)
      try {
        const { data, error } = await supabase
          .from('user_cases')
          .select('cases')
          .eq('user_id', user.sub)
          .maybeSingle()

        if (data?.cases) {
          const remoteCases = data.cases as AnalysisResult[]
          setRecentAnalyses(remoteCases)
          // Set initial selection if not set
          if (!selectedCaseId && remoteCases.length > 0) {
            setSelectedCaseId(remoteCases[0].caseId)
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
  }, [user, user?.sub])

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

  const openActions = useMemo(
    () => recentItems.filter((item) => item.detectedIssues.length > 0).length,
    [recentItems]
  )

  const latestAnalysis = recentItems[0] ?? null

  const originalCharges = selectedAnalysis?.extractedFields.billedAmount ?? null
  const savingsValue = selectedAnalysis ? getPotentialSavings(selectedAnalysis) : null
  const correctedCharges =
    typeof originalCharges === "number" && typeof savingsValue === "number"
      ? Math.max(originalCharges - savingsValue, 0)
      : selectedAnalysis?.extractedFields.insurerPaid ?? null

  const chartValues = [originalCharges ?? 0, correctedCharges ?? 0, savingsValue ?? 0]
  const chartMax = Math.max(...chartValues, 1)

  const bars = [
    {
      label: "Original Charges",
      value: originalCharges,
      className: "bg-slate-300",
    },
    {
      label: "Corrected Charges",
      value: correctedCharges,
      className: "bg-blue-500",
    },
    {
      label: "Savings",
      value: savingsValue,
      className: "bg-blue-700",
    },
  ]

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-[var(--border)] bg-white p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-3 text-sm text-slate-600">Loading profile...</p>
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-[var(--border)] bg-white p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-3 text-sm text-slate-600">
            You are not signed in. Use Auth0 login to view your profile dashboard.
          </p>
          <button
            onClick={() => loginWithRedirect()}
            className="mt-6 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Login with Auth0
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Spotlight />
      <div className="space-y-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Billing Audit Workspace</h1>
            <p className="mt-2 text-sm text-slate-600">
              Monitor value delivered and move cleanly into a new analysis when needed.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-white px-3 py-2">
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.picture}
                alt={user.name ?? user.email ?? "User"}
                className="h-9 w-9 rounded-full border border-[var(--border)] object-cover"
              />
            ) : (
              <div className="h-9 w-9 rounded-full border border-[var(--border)] bg-slate-100" />
            )}
            <div>
              <p className="text-sm font-medium tracking-tight text-slate-900">{profileValue(user.name)}</p>
              <p className="text-xs text-slate-600">{profileValue(user.email)}</p>
            </div>
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="ml-2 inline-flex rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="animate-fade-up relative overflow-hidden rounded-3xl border border-[var(--border)] bg-white p-6 sm:p-8">
          <StackedPanels />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">MedBill Agent</p>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Catch hidden billing errors before they cost you more.
              </h2>
              <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Upload your bill and EOB, run the audit engine, and launch provider outreach from one workspace with
                cleaner visuals and faster action paths.
              </p>
              <Button asChild size="lg" className="shadow-sm transition-transform duration-300 hover:scale-[1.03]">
                <Link href="/analysis/new">Start New Analysis</Link>
              </Button>
            </div>
            <SplineScene className="h-56 sm:h-64" />
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section 1</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Summary Metrics</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <MetricCard
              title="Total Savings Identified"
              value={formatCurrency(totalSavings)}
              subtitle={recentItems.length > 0 ? "Across recent analyses" : "Run an analysis to populate this"}
              emphasis
            />
            <MetricCard
              title="Issues Found"
              value={String(totalIssues)}
              subtitle={recentItems.length > 0 ? "Across recent analyses" : "No issues detected yet"}
            />
            <MetricCard
              title="Cases Reviewed"
              value={String(recentItems.length)}
              subtitle="Stored in your local workspace history"
            />
            <MetricCard
              title="Open Actions"
              value={String(openActions)}
              subtitle={latestAnalysis ? `Last analysis: ${formatDateTime(latestAnalysis.analyzedAt)}` : "No recent analyses"}
            />
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section 2</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Start New Analysis</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Start a focused document review workflow for a medical bill and EOB, then receive issue findings and next-step actions.
              </p>
            </div>
            <Link
              href="/analysis/new"
              className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Start New Analysis
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section 3</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Savings Visualization</h2>
            <p className="mt-2 text-sm text-slate-600">
              Value view for the currently selected recent case.
            </p>
          </div>

          {selectedAnalysis ? (
            <div className="space-y-4">
              {bars.map((bar) => {
                const value = bar.value ?? 0
                const widthPct = Math.max(6, (value / chartMax) * 100)
                return (
                  <div key={bar.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-800">{bar.label}</p>
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(bar.value)}</p>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div className={`h-3 rounded-full ${bar.className}`} style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                )
              })}
              <p className="text-xs text-slate-500">
                Based on billed amount, insurer-paid amount, and estimated patient responsibility.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm text-slate-700">Run your first analysis to view charge comparison and savings.</p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section 4</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Recent Analyses</h2>
              <p className="mt-2 text-sm text-slate-600">
                Recent case snapshots from your current workspace history.
              </p>
            </div>
            <Link
              href="/analysis/new"
              className="inline-flex rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Open Analysis Workspace
            </Link>
          </div>

          {recentItems.length > 0 ? (
            <div className="space-y-3">
              {recentItems.map((item) => {
                const isSelected = selectedAnalysis?.caseId === item.caseId
                const issueCount = item.detectedIssues.length
                const status = issueCount > 0 ? "Action recommended" : "No issues"
                const provider = item.extractedFields.provider ?? "Unknown provider"
                const billed = item.extractedFields.billedAmount
                const savings = getPotentialSavings(item)
                return (
                  <button
                    key={item.caseId}
                    type="button"
                    onClick={() => router.push(`/analysis/${item.caseId}`)}
                    onMouseEnter={() => setSelectedCaseId(item.caseId)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${isSelected ? "border-blue-300 bg-blue-50/40" : "border-[var(--border)] bg-white hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{provider}</p>
                        <p className="text-xs text-slate-600">{formatDateTime(item.analyzedAt)}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                      <p><span className="font-medium text-slate-900">Billed:</span> {formatCurrency(billed)}</p>
                      <p><span className="font-medium text-slate-900">Savings:</span> {formatCurrency(savings)}</p>
                      <p><span className="font-medium text-slate-900">Issues:</span> {issueCount}</p>
                      <p><span className="font-medium text-slate-900">Next step:</span> {getRecommendedAction(item)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm text-slate-700">No prior analyses yet. Your recent cases will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  emphasis = false,
}: {
  title: string
  value: string
  subtitle: string
  emphasis?: boolean
}) {
  return (
    <div className={`rounded-lg border border-[var(--border)] bg-white p-4 ${emphasis ? "lg:p-5" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-2 font-semibold tracking-tight text-slate-900 ${emphasis ? "text-4xl" : "text-2xl"}`}>{value}</p>
      <p className="mt-2 text-xs text-slate-600">{subtitle}</p>
    </div>
  )
}
