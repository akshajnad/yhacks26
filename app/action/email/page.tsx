"use client"
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import type { AnalysisResult } from "@/types/analysis"

const RECENT_ANALYSES_STORAGE_KEY = "redline.recent-analyses.v1"

type ComposerStatus = "idle" | "loading" | "ready" | "error"

interface GeneratedDraft {
  recipientType: "provider" | "insurer"
  to: string
  subject: string
  body: string
}

function loadAnalysisByCaseId(caseId: string | null): AnalysisResult | null {
  if (!caseId) return null
  if (typeof window === "undefined") return null

  try {
    const raw = localStorage.getItem(RECENT_ANALYSES_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AnalysisResult[]
    return parsed.find((item) => item.caseId === caseId) ?? null
  } catch {
    return null
  }
}

export default function EmailComposerPage() {
  const [caseId, setCaseId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCaseId(params.get("caseId"))
  }, [])

  const analysis = useMemo(() => loadAnalysisByCaseId(caseId), [caseId])
  const [status, setStatus] = useState<ComposerStatus>("idle")
  const [error, setError] = useState<string>("")

  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [recipientType, setRecipientType] = useState<GeneratedDraft["recipientType"]>("provider")
  const [sendState, setSendState] = useState("")

  const [gmailConnectedEmail, setGmailConnectedEmail] = useState<string | null>(null)
  const [isExpectedSender, setIsExpectedSender] = useState(false)

  const canGenerate = Boolean(analysis)

  const summary = useMemo(() => {
    if (!analysis) return ""
    return `Case ${analysis.caseId} · Issues ${analysis.detectedIssues.length}`
  }, [analysis])

  const refreshGoogleSession = async () => {
    const res = await fetch("/api/google/session", { cache: "no-store" })
    const data = await res.json()
    if (res.ok && data.connected) {
      setGmailConnectedEmail(data.email ?? null)
      setIsExpectedSender(Boolean(data.isExpectedSender))
    } else {
      setGmailConnectedEmail(null)
      setIsExpectedSender(false)
    }
  }

  useEffect(() => {
    refreshGoogleSession().catch(() => {
      setGmailConnectedEmail(null)
      setIsExpectedSender(false)
    })
  }, [])

  useEffect(() => {
    if (!canGenerate || !analysis) return

    setStatus("loading")
    setError("")

    fetch("/api/email/generate-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisResult: analysis }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to generate draft")
        return data as GeneratedDraft
      })
      .then((draft) => {
        setRecipientType(draft.recipientType)
        setTo(draft.to)
        setSubject(draft.subject)
        setEmailBody(draft.body)
        setStatus("ready")
      })
      .catch((err) => {
        setStatus("error")
        setError(err instanceof Error ? err.message : "Failed to generate email draft")
      })
  }, [canGenerate, analysis])

  const handleGoogleConnect = () => {
    window.location.href = "/api/google/oauth/start"
  }

  const submitToGmail = async (mode: "draft" | "send") => {
    setSendState("")
    const res = await fetch("/api/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, to, subject, body: emailBody }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error ?? `Gmail ${mode} failed`)
    }

    setSendState(mode === "draft" ? "Draft saved to Gmail successfully." : "Email sent successfully.")
    await refreshGoogleSession()
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-6 rounded-xl border border-[var(--border)] bg-white p-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Take Action</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Email Providers</h1>
          <p className="mt-2 text-sm text-slate-600">
            Generate, edit, and send a dispute email using your authorized Gmail account.
          </p>
          {summary ? <p className="mt-1 text-xs text-slate-500">{summary}</p> : null}
        </header>

        {!analysis ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            No analysis found for this tab. Open this page from the analysis result “Email Providers” action.
          </div>
        ) : null}

        <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4 text-sm">
          <p className="font-medium text-slate-800">Connected Gmail</p>
          <p className="mt-1 text-slate-600">
            {gmailConnectedEmail ? `Signed in as ${gmailConnectedEmail}` : "No Google account connected."}
          </p>
          {gmailConnectedEmail && !isExpectedSender ? (
            <p className="mt-2 text-red-700">
              This feature only sends when the connected account is akshajnadn@gmail.com.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGoogleConnect}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Connect Google
            </button>
            <button
              type="button"
              onClick={() => refreshGoogleSession()}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Refresh connection
            </button>
          </div>
        </div>

        {status === "loading" ? <p className="text-sm text-slate-600">Generating draft from analysis…</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="grid gap-4">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Recipient Type</span>
            <input
              readOnly
              value={recipientType}
              className="w-full rounded-md border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">To</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Body</span>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={16}
              className="w-full rounded-md border border-[var(--border)] px-3 py-2 font-mono text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => submitToGmail("draft").catch((err) => setSendState(err.message))}
            className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Save Draft to Gmail
          </button>
          <button
            type="button"
            onClick={() => submitToGmail("send").catch((err) => setSendState(err.message))}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Send Email
          </button>
        </div>

        {sendState ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800 border-l-4 border-slate-900 pl-3 py-1 bg-slate-50">{sendState}</p>
            
            {sendState.includes("Email sent successfully") && (
              <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 shadow-sm animate-in slide-in-from-bottom-2 duration-500">
                <div className="mt-0.5 rounded-full bg-blue-100 p-1">
                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-900">Follow-up Scheduled</h4>
                  <p className="mt-1 text-sm text-blue-700 leading-relaxed">
                    Dispute email dispatched. Our Redline agent has scheduled an automated follow-up in <span className="font-bold underline">7 days</span> to check for a response and verify if further action is required.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
