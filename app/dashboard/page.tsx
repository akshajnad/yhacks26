"use client"

import { useAuth0 } from "@auth0/auth0-react"
import { useEffect, useState } from "react"
import { MultiUploadZone } from "@/components/MultiUploadZone"
import { AnalysisResultDisplay } from "@/components/AnalysisResult"
import type { AnalysisResult } from "@/types/analysis"

function profileValue(value?: string | null) {
  if (!value) return "Not provided"
  return value
}

export default function DashboardPage() {
  const { user, isLoading, loginWithRedirect, logout } = useAuth0()
  const [mounted, setMounted] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")

  useEffect(() => setMounted(true), [])

  if (!mounted || isLoading) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <div className="rounded-xl border border-[var(--border)] bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Loading profile...</p>
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <div className="rounded-xl border border-[var(--border)] bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
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
    <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 space-y-6">
      {/* Profile card */}
      <div className="rounded-xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.picture}
                alt={user.name ?? user.email ?? "User"}
                className="h-12 w-12 rounded-full border border-[var(--border)] object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full border border-[var(--border)] bg-slate-100" />
            )}
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">{profileValue(user.name)}</h1>
              <p className="text-sm text-slate-600">{profileValue(user.email)}</p>
            </div>
          </div>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="inline-flex rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Upload section */}
      <div className="rounded-xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Analyze Medical Bills</h2>
            <p className="mt-1 text-sm text-slate-600">
              Upload your medical bill and EOB to detect billing issues and get dispute recommendations.
            </p>
          </div>
          {analysisResult && (
            <button
              onClick={() => {
                setAnalysisResult(null)
                setError("")
              }}
              className="inline-flex rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              New Analysis
            </button>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="shrink-0 text-red-400 hover:text-red-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Upload zone (hidden when results are showing) */}
        {!analysisResult && (
          <MultiUploadZone onResult={setAnalysisResult} onError={setError} />
        )}
      </div>

      {/* Analysis results */}
      {analysisResult && (
        <AnalysisResultDisplay result={analysisResult} />
      )}
    </section>
  )
}
