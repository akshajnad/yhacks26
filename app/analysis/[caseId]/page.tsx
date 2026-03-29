"use client"

import { useAuth0 } from "@auth0/auth0-react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { AnalysisResultDisplay } from "@/components/AnalysisResult"
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
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Analysis Report</h1>
                    <p className="text-sm text-slate-600">Case ID: {caseId}</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    Print Report
                </button>
            </div>

            {result && <AnalysisResultDisplay result={result} />}
        </div>
    )
}
