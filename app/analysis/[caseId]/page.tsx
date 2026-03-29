"use client"

import { useAuth0 } from "@auth0/auth0-react"
import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { AnalysisResultDisplay } from "@/components/AnalysisResult"
import type { AnalysisResult } from "@/types/analysis"

const RECENT_ANALYSES_STORAGE_KEY = "NIPS.recent-analyses.v1"
const MAX_RECENT_ANALYSES = 5

function writeRecentAnalysesMerge(updated: AnalysisResult) {
  try {
    const raw = localStorage.getItem(RECENT_ANALYSES_STORAGE_KEY)
    const prev = raw ? (JSON.parse(raw) as AnalysisResult[]) : []
    const deduped = prev.filter((c) => c.caseId !== updated.caseId)
    localStorage.setItem(
      RECENT_ANALYSES_STORAGE_KEY,
      JSON.stringify([updated, ...deduped].slice(0, MAX_RECENT_ANALYSES))
    )
  } catch {
    /* ignore */
  }
}

async function persistCaseToSupabase(userSub: string, updated: AnalysisResult) {
  const { data, error: fetchError } = await supabase
    .from("user_cases")
    .select("cases")
    .eq("user_id", userSub)
    .maybeSingle()

  if (fetchError) {
    console.error("Supabase fetch error:", fetchError)
    return
  }

  let merged: AnalysisResult[] = [updated]
  if (data?.cases) {
    const existing = data.cases as AnalysisResult[]
    merged = [updated, ...existing.filter((c) => c.caseId !== updated.caseId)]
  }

  const { error: upsertError } = await supabase.from("user_cases").upsert({
    user_id: userSub,
    cases: merged,
    updated_at: new Date().toISOString(),
  })

  if (upsertError) console.error("Supabase upsert error:", upsertError)
}

export default function AnalysisDetailPage() {
    const { user, isLoading: authLoading } = useAuth0()
    const { caseId } = useParams()
    const router = useRouter()

    const [result, setResult] = useState<AnalysisResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [insightsRefreshing, setInsightsRefreshing] = useState(false)
    const [insightsBanner, setInsightsBanner] = useState<string | null>(null)

    const handleRefreshCallInsights = useCallback(async () => {
        if (!result || !user?.sub) return
        setInsightsRefreshing(true)
        setInsightsBanner(null)
        try {
            const res = await fetch("/api/outreach/elevenlabs/call-insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ analysis: result, refresh: true }),
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error ?? "Could not refresh call insights.")
            }
            const updated: AnalysisResult = {
                ...result,
                elevenLabsCallInsights: data.insights,
            }
            setResult(updated)
            writeRecentAnalysesMerge(updated)
            await persistCaseToSupabase(user.sub, updated)
            if (data.isNewConversation) {
                setInsightsBanner(
                    "Updated: a newer ElevenLabs conversation was found for this case’s MedBill user id."
                )
            } else {
                setInsightsBanner("Call insights refreshed from ElevenLabs.")
            }
        } catch (e) {
            setInsightsBanner(
                e instanceof Error ? e.message : "Refresh failed."
            )
        } finally {
            setInsightsRefreshing(false)
        }
    }, [result, user?.sub])

    useEffect(() => {
        async function fetchCase() {
            if (!user?.sub || !caseId) return

            setLoading(true)
            try {
                const { data, error: fetchError } = await supabase
                    .from('user_cases')
                    .select('cases')
                    .eq('user_id', user.sub)
                    .maybeSingle()

                if (fetchError) throw fetchError

                if (data?.cases) {
                    const allCases = data.cases as AnalysisResult[]
                    const found = allCases.find((c) => c.caseId === caseId)
                    if (found) {
                        setResult(found)
                    } else {
                        setError("Case not found.")
                    }
                } else {
                    setError("No cases found for this user.")
                }
            } catch (err) {
                console.error("Error fetching case:", err)
                setError("Failed to load analysis details.")
            } finally {
                setLoading(false)
            }
        }

        if (!authLoading) {
            if (user) {
                fetchCase()
            } else {
                router.push("/")
            }
        }
    }, [user, caseId, authLoading, router])

    if (authLoading || (loading && !error)) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4 text-slate-600">Loading analysis details...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-20 text-center">
                <div className="rounded-xl border border-red-200 bg-red-50 p-8">
                    <h1 className="text-xl font-semibold text-red-900">Error</h1>
                    <p className="mt-2 text-red-700">{error}</p>
                    <Link href="/dashboard" className="mt-6 inline-block text-blue-600 hover:underline">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Analysis Report</h1>
                    <p className="text-sm text-slate-600">Case ID: {caseId}</p>
                    <p className="mt-1 text-xs text-slate-500">
                        MedBill user id for ElevenLabs:{" "}
                        <code className="rounded bg-slate-100 px-1 font-mono text-slate-800">
                            medbill-{String(caseId).slice(0, 8)}
                        </code>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void handleRefreshCallInsights()}
                        disabled={insightsRefreshing || !result}
                        className="rounded-md border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50"
                    >
                        {insightsRefreshing ? "Refreshing…" : "Refresh call insights"}
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Print Report
                    </button>
                </div>
            </div>

            {insightsBanner && (
                <div
                    className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                        insightsBanner.includes("fail") || insightsBanner.includes("not ")
                            ? "border-amber-200 bg-amber-50 text-amber-900"
                            : "border-violet-200 bg-violet-50 text-violet-900"
                    }`}
                >
                    {insightsBanner}
                </div>
            )}

            {result && <AnalysisResultDisplay result={result} />}
        </div>
    )
}
