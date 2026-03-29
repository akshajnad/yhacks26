"use client"
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { AnalysisResult } from "@/types/analysis"
import type { OutreachBrief, CallBriefResponse, ElevenLabsCallPayload } from "@/types/outreach"

const RECENT_ANALYSES_STORAGE_KEY = "redline.recent-analyses.v1"

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded border border-[var(--border)] bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

function ScriptSection({ title, items, color }: { title: string; items: string[]; color: "blue" | "purple" | "amber" | "red" }) {
  const colorMap = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    purple: "border-purple-100 bg-purple-50 text-purple-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    red: "border-red-100 bg-red-50 text-red-700",
  }
  return (
    <div className={`rounded-md border px-3 py-2 ${colorMap[color]}`}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide">{title}</p>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs">
             • {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PhoneIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-4 justify-center text-sm text-slate-500">
      <svg className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label}
    </div>
  )
}

export default function CallPage() {
  const [caseId, setCaseId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCaseId(params.get("caseId"))
  }, [])

  const analysis = useMemo(() => loadAnalysisByCaseId(caseId), [caseId])

  const [brief, setBrief] = useState<OutreachBrief | null>(null)
  const [briefWithOverrides, setBriefWithOverrides] = useState<OutreachBrief | null>(null)
  
  const [callBrief, setCallBrief] = useState<CallBriefResponse | null>(null)
  const [elevenLabsPayload, setElevenLabsPayload] = useState<ElevenLabsCallPayload | null>(null)

  const [callLoading, setCallLoading] = useState(false)
  const [callError, setCallError] = useState<string | null>(null)
  const [callSuccess, setCallSuccess] = useState<{ toNumber: string } | null>(null)

  // Status flags for the auto-generation cascade
  const [statusText, setStatusText] = useState("Identifying targets...")

  const hasFetched = useRef(false)
  
  // 1. Fetch Outreach Plan
  useEffect(() => {
    if (!analysis || hasFetched.current) return
    hasFetched.current = true

    setStatusText("Analyzing case for outreach plan...")
    
    fetch("/api/outreach/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis }),
    })
      .then((res) => res.json())
      .then((data: OutreachBrief) => {
        // Auto-fill from extracted fields
        const ef = analysis.extractedFields
        const builtOverrides = data.contactTargets.map((t) => {
          let email = t.toEmail
          let phone = t.toNumber
          if (t.audience === "provider") {
            email = ef.providerEmail ?? email
            phone = ef.providerPhone ?? phone
          } else if (t.audience === "insurer") {
            email = ef.insurerEmail ?? email
            phone = ef.insurerPhone ?? phone
          }
          return { ...t, toEmail: email, toNumber: phone }
        })

        const combinedBrief = { ...data, contactTargets: builtOverrides }
        setBrief(combinedBrief)
        setBriefWithOverrides(combinedBrief)
      })
      .catch((err) => {
        console.error(err)
        setStatusText("Error fetching outreach plan. Please try again.")
      })
  }, [analysis])

  // 2. Generate Call Brief 
  useEffect(() => {
    if (!briefWithOverrides || callBrief) return

    setStatusText("Generating your personalized Call Brief...")
    
    const target = briefWithOverrides.contactTargets.find((t) => t.audience === "provider") ?? briefWithOverrides.contactTargets[0]
    if (!target) {
      setStatusText("No contact targets available. Cannot build call brief.")
      return
    }

    fetch("/api/outreach/call-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outreachBrief: briefWithOverrides, targetId: target.id }),
    })
      .then((res) => res.json())
      .then((data: CallBriefResponse) => {
        setCallBrief(data)
      })
      .catch((err) => {
        console.error(err)
        setStatusText("Error generating call brief.")
      })
  }, [briefWithOverrides])

  // 3. Build ElevenLabs Payload
  useEffect(() => {
    if (!briefWithOverrides || !callBrief || elevenLabsPayload) return

    setStatusText("Building ElevenLabs payload...")
    
    const target = briefWithOverrides.contactTargets.find((t) => t.audience === "provider") ?? briefWithOverrides.contactTargets[0]
    if (!target) return

    fetch("/api/outreach/elevenlabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outreachBrief: briefWithOverrides,
        callBrief,
        targetId: target.id,
      }),
    })
      .then((res) => res.json())
      .then((data: ElevenLabsCallPayload) => {
        setElevenLabsPayload(data)
        setStatusText("") // Fully loaded
      })
      .catch((err) => {
        console.error(err)
        setStatusText("Error generating ElevenLabs payload.")
      })
  }, [callBrief])

  const target = briefWithOverrides?.contactTargets.find((t) => t.audience === "provider") ?? briefWithOverrides?.contactTargets[0]

  const handlePlaceCall = async () => {
    if (!elevenLabsPayload) return
    setCallLoading(true)
    setCallError(null)
    setCallSuccess(null)
    try {
      const res = await fetch("/api/outreach/elevenlabs/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: elevenLabsPayload }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Call failed")
      }
      setCallSuccess({ toNumber: data.toNumber })
    } catch (err) {
      setCallError(err instanceof Error ? err.message : String(err))
    } finally {
      setCallLoading(false)
    }
  }

  if (!analysis) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          No analysis found for this tab. Open this page from the analysis result "Call Providers" action.
        </div>
      </section>
    )
  }

  const isLoading = !elevenLabsPayload && !!statusText
  const hasPhone = Boolean(elevenLabsPayload?.recipient?.toNumber)

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-6 rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <header className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Take Action</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Place Provider Call</h1>
            <p className="mt-2 text-sm text-slate-600">
              Review the auto-generated call brief below and place a secure, automated call using ElevenLabs.
            </p>
          </div>
          {elevenLabsPayload && (
             <Button
                size="lg"
                onClick={handlePlaceCall}
                disabled={callLoading || !hasPhone || elevenLabsPayload.mode === "preview"}
                className="shrink-0 gap-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-base py-6 px-8 shadow-md transition-transform hover:scale-105"
             >
               {callLoading ? (
                 <>
                   <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                   </svg>
                   Calling...
                 </>
               ) : (
                 <>
                   <PhoneIcon />
                   Place Call
                 </>
               )}
             </Button>
          )}
        </header>

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
             <LoadingSpinner label={statusText} />
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
             
             {/* Preview/Config Warning Banner */}
             {elevenLabsPayload?.mode === "preview" && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold text-amber-900">Preview mode active:</span> Set{" "}
                    <code className="rounded bg-amber-100 px-1.5 font-mono text-amber-900">ELEVENLABS_API_KEY</code>,{" "}
                    <code className="rounded bg-amber-100 px-1.5 font-mono text-amber-900">ELEVENLABS_AGENT_ID</code>, and{" "}
                    <code className="rounded bg-amber-100 px-1.5 font-mono text-amber-900">ELEVENLABS_AGENT_PHONE_NUMBER_ID</code>{" "}
                    in <code className="rounded bg-amber-100 px-1.5 font-mono text-amber-900">.env.local</code> to enable live automated calls.
                  </p>
                </div>
             )}

             {/* Call Notifications */}
             {callError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3">
                <p className="flex-1 text-sm text-red-700 font-medium">Failed to place call: {callError}</p>
              </div>
            )}
            {callSuccess && (
              <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-100 px-4 py-3">
                <svg className="h-5 w-5 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-medium text-green-800">
                  Call successfully initiated to {callSuccess.toNumber}. The ElevenLabs agent is calling them now.
                </p>
              </div>
            )}

            {/* Target Contact Info Autofilled from DB */}
            {target && elevenLabsPayload?.recipient && (
              <div className="rounded-lg border border-[var(--border)] bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Call Destination</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Calling: {target.organizationName} — {target.department}</p>
                  </div>
                  {!hasPhone && <Badge variant="destructive">No Phone Extracted</Badge>}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={elevenLabsPayload.recipient.toNumber || ""}
                      onChange={(e) => setElevenLabsPayload({
                        ...elevenLabsPayload,
                        recipient: { ...elevenLabsPayload.recipient, toNumber: e.target.value }
                      })}
                      placeholder="e.g. +1234567890"
                    />
                  </div>
                  <div className="flex-1 border-slate-100 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                    <input
                      type="email"
                      className="w-full rounded-md border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={target.toEmail || ""}
                      onChange={(e) => setBriefWithOverrides(prev => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          contactTargets: prev.contactTargets.map(t => 
                            t.id === target.id ? { ...t, toEmail: e.target.value } : t
                          )
                        }
                      })}
                      placeholder="e.g. billing@hospital.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Call Brief Highlights */}
            {callBrief && (
              <div className="space-y-4">
                 <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">Conversation Script</h3>
                 
                 <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Agent's Opening Line</p>
                    <CopyButton text={callBrief.openingScript} />
                  </div>
                  <textarea
                    className="min-h-[90px] w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[15px] font-medium leading-relaxed text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={elevenLabsPayload?.conversation?.firstMessage || callBrief.openingScript || ""}
                    onChange={(e) => {
                      if (elevenLabsPayload) {
                        setElevenLabsPayload({
                          ...elevenLabsPayload,
                          conversation: { ...elevenLabsPayload.conversation, firstMessage: e.target.value }
                        });
                      }
                      setCallBrief({
                        ...callBrief,
                        openingScript: e.target.value
                      });
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ScriptSection title="Must Say Goals" items={callBrief.mustSay} color="blue" />
                  {callBrief.legalPoints.length > 0 && <ScriptSection title="Legal Points to Bring Up" items={callBrief.legalPoints} color="purple" />}
                  <ScriptSection title="Escalation Path if Unresolved" items={callBrief.escalationPath} color="amber" />
                  {callBrief.prohibitedClaims.length > 0 && <ScriptSection title="Do NOT Say (Risk)" items={callBrief.prohibitedClaims} color="red" />}
                </div>

                <div className="rounded-md border border-slate-200 bg-white px-5 py-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Agent's Reference Variables
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500 text-xs">Member ID</span>
                      <p className="font-mono font-medium text-slate-900">{callBrief.referenceNumbers.memberID || "—"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Claim #</span>
                      <p className="font-mono font-medium text-slate-900">{callBrief.referenceNumbers.claimNumber || "—"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Account #</span>
                      <p className="font-mono font-medium text-slate-900">{callBrief.referenceNumbers.accountNumber || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
