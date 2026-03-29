"use client"

import Link from "next/link"
import { useAuth0 } from "@auth0/auth0-react"
import { useCallback, useState } from "react"
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react"
import { MultiUploadZone } from "@/components/MultiUploadZone"
import { AnalysisResultDisplay } from "@/components/AnalysisResult"
import { ClaimWorkspacePreview } from "@/components/ClaimWorkspacePreview"
import { Button } from "@/components/ui/button"
import type { AnalysisResult } from "@/types/analysis"
import { supabase } from "@/lib/supabase"

const RECENT_ANALYSES_STORAGE_KEY = "redline.recent-analyses.v1"
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
  const prevLocal = readRecentAnalyses()
  const dedupedLocal = prevLocal.filter((item) => item.caseId !== result.caseId)
  writeRecentAnalyses([result, ...dedupedLocal])

  if (!userId) return

  try {
    const { data, error: fetchError } = await supabase
      .from("user_cases")
      .select("cases")
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError)
      return
    }

    let updatedCases: AnalysisResult[] = [result]

    if (data?.cases) {
      const existingCases = data.cases as AnalysisResult[]
      const deduped = existingCases.filter((entry) => entry.caseId !== result.caseId)
      updatedCases = [result, ...deduped]
    }

    const { error: upsertError } = await supabase.from("user_cases").upsert({
      user_id: userId,
      cases: updatedCases,
      updated_at: new Date().toISOString(),
    })

    if (upsertError) {
      console.error("Supabase upsert error:", upsertError)
    }
  } catch (err) {
    console.error("Failed to persist to Supabase:", err)
  }
}

export default function NewAnalysisPage() {
  const { user, isLoading, loginWithRedirect } = useAuth0()
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")

  const handleResult = useCallback(
    (result: AnalysisResult) => {
      setAnalysisResult(result)
      setError("")
      persistRecentAnalysis(result, user?.sub)
    },
    [user?.sub]
  )

  const handleReset = () => {
    setAnalysisResult(null)
    setError("")
  }

  if (isLoading) {
    return (
      <section className="section-shell">
        <div className="paper-panel p-8">
          <p className="eyebrow">Starting your claim</p>
          <h1 className="section-title mt-4">Loading your workspace.</h1>
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="section-shell">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-center">
          <div className="copy-column">
            <p className="eyebrow">Start your claim</p>
            <h1 className="display-md mt-4 text-balance">Sign in to upload your bill and insurer response.</h1>
            <p className="body-copy mt-5">
              The workflow is designed for people who need fast clarity, not more billing jargon. After sign-in you can upload the bill, EOB, and denial letter if you have one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => loginWithRedirect()}>
                Sign in to start
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/#process">See the process</Link>
              </Button>
            </div>
          </div>

          <ClaimWorkspacePreview compact />
        </div>
      </section>
    )
  }

  return (
    <div>
      <section className="section-shell pb-10 pt-10 md:pb-12 md:pt-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="copy-column">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-700)] transition-colors hover:text-[var(--color-ink-900)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to cases
            </Link>
            <p className="eyebrow mt-5">Claim intake</p>
            <h1 className="display-md mt-4 text-balance">
              {analysisResult ? "Your claim review is ready." : "Upload the documents and we will translate them into a case."}
            </h1>
            <p className="body-copy mt-5">
              {analysisResult
                ? "Review the findings, understand the issue logic, and decide what to send next."
                : "The goal is to get you to the first useful answer quickly: what looks wrong, what it means, and what the next step should be."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {analysisResult ? (
              <>
                <Button size="lg" onClick={handleReset}>
                  Review another case
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/dashboard">Open dashboard</Link>
                </Button>
              </>
            ) : (
              <div className="status-chip teal">
                <ShieldCheck className="h-3.5 w-3.5" />
                You review before anything is submitted
              </div>
            )}
          </div>
        </div>
      </section>

      {!analysisResult ? (
        <section className="section-shell pt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
            <div className="paper-panel p-6 md:p-8">
              {error ? (
                <div className="mb-6 rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-coral-400)_22%,var(--color-stone-200)_78%)] bg-[color-mix(in_srgb,var(--color-coral-400)_10%,var(--color-white)_90%)] px-4 py-3 text-sm text-[var(--color-coral-500)]">
                  {error}
                </div>
              ) : null}

              <MultiUploadZone onResult={handleResult} onError={setError} />
            </div>

            <div className="space-y-4">
              <ClaimWorkspacePreview compact />

              <div className="sage-panel p-6">
                <div className="eyebrow">What you will get</div>
                <ul className="mt-4 space-y-3">
                  {[
                    "A normalized bill and EOB review table",
                    "Plain-language issue explanations",
                    "Recommended dispute paths and draft-ready next steps",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-[var(--color-ink-700)]">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--color-teal-500)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-teal-700)]">
                  The first useful outcome is clarity
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="section-shell pt-0">
          <AnalysisResultDisplay key={analysisResult.caseId} result={analysisResult} progressive />
        </section>
      )}
    </div>
  )
}
