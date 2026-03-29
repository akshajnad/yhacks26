"use client"

import { useAuth0 } from "@auth0/auth0-react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { AnalysisResultDisplay } from "@/components/AnalysisResult"
import { Button } from "@/components/ui/button"
import type { AnalysisResult } from "@/types/analysis"

export default function AnalysisDetailPage() {
  const { user, isLoading: authLoading } = useAuth0()
  const { caseId } = useParams()
  const router = useRouter()

  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCase() {
      if (!user?.sub || !caseId) return

      setLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from("user_cases")
          .select("cases")
          .eq("user_id", user.sub)
          .maybeSingle()

        if (fetchError) throw fetchError

        if (data?.cases) {
          const allCases = data.cases as AnalysisResult[]
          const found = allCases.find((entry) => entry.caseId === caseId)
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
  }, [authLoading, caseId, router, user])

  if (authLoading || (loading && !error)) {
    return (
      <section className="section-shell">
        <div className="paper-panel p-8">
          <p className="eyebrow">Case review</p>
          <h1 className="section-title mt-4">Loading the saved case.</h1>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="section-shell">
        <div className="paper-panel p-8">
          <p className="eyebrow">Case review</p>
          <h1 className="section-title mt-4">We could not open this case.</h1>
          <p className="body-copy mt-5">{error}</p>
          <div className="mt-8">
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">Return to cases</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div>
      <section className="section-shell pb-10 pt-10 md:pb-12 md:pt-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-700)] transition-colors hover:text-[var(--color-ink-900)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to cases
            </Link>
            <p className="eyebrow mt-5">Saved claim review</p>
            <h1 className="display-md mt-4 text-balance">Reopen the case and continue from the evidence.</h1>
          </div>

          <Button variant="outline" size="lg" onClick={() => window.print()}>
            Print report
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="section-shell pt-0">{result ? <AnalysisResultDisplay result={result} /> : null}</section>
    </div>
  )
}
