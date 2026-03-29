"use client"

import Link from "next/link"
import { useAuth0 } from "@auth0/auth0-react"
import { useCallback, useState } from "react"
import { MultiUploadZone } from "@/components/MultiUploadZone"
import { AnalysisResultDisplay } from "@/components/AnalysisResult"
import type { AnalysisResult } from "@/types/analysis"
import { supabase } from "@/lib/supabase"

const RECENT_ANALYSES_STORAGE_KEY = "NIPS.recent-analyses.v1"
const MAX_RECENT_ANALYSES = 5

function readRecentAnalyses(): AnalysisResult[] {
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
          typeof item.analyzedAt === "string"
      )
      .slice(0, MAX_RECENT_ANALYSES)
  } catch {
    return []
  }
}

function writeRecentAnalyses(items: AnalysisResult[]) {
  try {
    localStorage.setItem(RECENT_ANALYSES_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT_ANALYSES)))
  } catch {
    // Ignore local storage write issues.
  }
}

async function persistRecentAnalysis(result: AnalysisResult, userId?: string) {
  // 1. Maintain local cache for immediate feedback
  const prevLocal = readRecentAnalyses()
  const dedupedLocal = prevLocal.filter((item) => item.caseId !== result.caseId)
  writeRecentAnalyses([result, ...dedupedLocal])

  // 2. Persist to Supabase if userId is available
  if (userId) {
    try {
      // Fetch existing cases
      const { data, error: fetchError } = await supabase
        .from('user_cases')
        .select('cases')
        .eq('user_id', userId)
        .maybeSingle()

      if (fetchError) {
        console.error("Supabase fetch error:", fetchError)
        return
      }

      let updatedCases: AnalysisResult[] = [result]

      if (data?.cases) {
        const existingCases = data.cases as AnalysisResult[]
        const deduped = existingCases.filter(c => c.caseId !== result.caseId)
        updatedCases = [result, ...deduped]
      }

      // Upsert back to Supabase
      const { error: upsertError } = await supabase
        .from('user_cases')
        .upsert({
          user_id: userId,
          cases: updatedCases,
          updated_at: new Date().toISOString()
        })

      if (upsertError) console.error("Supabase upsert error:", upsertError)
    } catch (err) {
      console.error("Failed to persist to Supabase:", err)
    }
  }
}

export default function NewAnalysisPage() {
  const { user, isLoading, loginWithRedirect } = useAuth0()
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")
  const [insightsRefreshing, setInsightsRefreshing] = useState(false)
  const [insightsBanner, setInsightsBanner] = useState<string | null>(null)

  const handleRefreshCallInsights = useCallback(async () => {
    if (!analysisResult || !user?.sub) return
    setInsightsRefreshing(true)
    setInsightsBanner(null)
    try {
      const res = await fetch("/api/outreach/elevenlabs/call-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: analysisResult, refresh: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Could not refresh call insights.")
      }
      const updated: AnalysisResult = {
        ...analysisResult,
        elevenLabsCallInsights: data.insights,
      }
      setAnalysisResult(updated)
      await persistRecentAnalysis(updated, user.sub)
      setInsightsBanner(
        data.isNewConversation
          ? "Updated: a newer ElevenLabs conversation was found for this case’s MedBill user id."
          : "Call insights refreshed from ElevenLabs."
      )
    } catch (e) {
      setInsightsBanner(e instanceof Error ? e.message : "Refresh failed.")
    } finally {
      setInsightsRefreshing(false)
    }
  }, [analysisResult, user?.sub])

  const handleResult = useCallback((result: AnalysisResult) => {
    setAnalysisResult(result)
    setError("")
    persistRecentAnalysis(result, user?.sub)
  }, [user?.sub])

  const handleReset = () => {
    setAnalysisResult(null)
    setError("")
  }

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-[var(--border)] bg-white p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New Analysis</h1>
          <p className="mt-3 text-sm text-slate-600">Loading profile...</p>
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-[var(--border)] bg-white p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New Analysis</h1>
          <p className="mt-3 text-sm text-slate-600">
            Sign in to upload documents and run a billing analysis.
          </p>
          <button
            onClick={() => loginWithRedirect()}
            className="mt-6 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Login with Auth0
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Analysis Workflow</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Start New Analysis</h1>
            <p className="mt-2 text-sm text-slate-600">
              Upload documents, investigate billing issues, and review recommended actions.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </header>

        {!analysisResult ? (
          <section className="rounded-xl border border-[var(--border)] bg-white p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Upload Documents</h2>
              <p className="mt-2 text-sm text-slate-600">
                Add the medical bill and EOB to begin review. A denial letter can be included if available.
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button onClick={() => setError("")} className="shrink-0 text-red-400 hover:text-red-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <MultiUploadZone onResult={handleResult} onError={setError} />
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Analysis Complete</p>
                <p className="text-xs text-slate-600">Case ID {analysisResult.caseId}</p>
                <p className="mt-1 text-xs text-slate-500">
                  ElevenLabs user id:{" "}
                  <code className="rounded bg-slate-100 px-1 font-mono">
                    medbill-{analysisResult.caseId.slice(0, 8)}
                  </code>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleRefreshCallInsights()}
                  disabled={insightsRefreshing}
                  className="inline-flex rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50"
                >
                  {insightsRefreshing ? "Refreshing…" : "Refresh call insights"}
                </button>
                <button
                  onClick={handleReset}
                  className="inline-flex rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Analyze Another Case
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
            {insightsBanner && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  insightsBanner.includes("fail") || insightsBanner.toLowerCase().includes("no ")
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-violet-200 bg-violet-50 text-violet-900"
                }`}
              >
                {insightsBanner}
              </div>
            )}
            <AnalysisResultDisplay key={analysisResult.caseId} result={analysisResult} progressive />
          </section>
        )}
      </div>
    </section>
  )
}
