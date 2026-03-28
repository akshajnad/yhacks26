"use client"

import { useState } from "react"
import { UploadZone } from "@/components/UploadZone"
import { AnalysisResultDisplay } from "@/components/AnalysisResult"
import type { AnalysisResult } from "@/types/analysis"

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string>("")

  const handleResult = (r: AnalysisResult) => {
    setResult(r)
    setError("")
    // Scroll to results
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  const handleNewAnalysis = () => {
    setResult(null)
    setError("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
          Medical Bill Analyzer
        </h1>
        <p className="mx-auto max-w-xl text-[var(--muted-foreground)]">
          Upload a medical bill or Explanation of Benefits (EOB). Our AI identifies overcharges,
          billing errors, denial flags, and No Surprises Act violations — then tells you exactly what to do next.
        </p>
      </div>

      {/* How it works */}
      {!result && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Step num={1} title="Upload" desc="Drop your PDF bill or EOB, or an image of the document." />
          <Step num={2} title="Analyze" desc="Gemini AI extracts key fields and detects billing issues." />
          <Step num={3} title="Act" desc="Get plain-English explanations and recommended next steps." />
        </div>
      )}

      {/* Upload zone */}
      {!result && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <UploadZone onResult={handleResult} onError={setError} />
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div id="results" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Analysis Results</h2>
            <button
              onClick={handleNewAnalysis}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Analyze another bill
            </button>
          </div>
          <AnalysisResultDisplay result={result} />
        </div>
      )}
    </div>
  )
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
        {num}
      </span>
      <div>
        <p className="font-medium text-[var(--foreground)]">{title}</p>
        <p className="text-sm text-[var(--muted-foreground)]">{desc}</p>
      </div>
    </div>
  )
}
