"use client"

import { useState, useRef, useEffect } from "react"
import type { AnalysisResult } from "@/types/analysis"
import { Button } from "./ui/button"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function ChatOverlay({ analysis: propAnalysis }: { analysis?: AnalysisResult }) {
  const [isOpen, setIsOpen] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(propAnalysis ?? null)

  // Try to load latest analysis from localStorage if not provided via props
  useEffect(() => {
    if (propAnalysis) {
      setAnalysis(propAnalysis)
    } else {
      const RECENT_ANALYSES_STORAGE_KEY = "NIPS.recent-analyses.v1"
      try {
        const raw = localStorage.getItem(RECENT_ANALYSES_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as AnalysisResult[]
          if (parsed.length > 0) {
            setAnalysis(parsed[0]) // Use the most recent one
          }
        }
      } catch (err) {
        console.error("Failed to load local analysis for chat", err)
      }
    }
  }, [propAnalysis])

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm NIPS AI. How can I help you understand this medical bill today?",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      // Build context string for the AI - safe check for analysis
      let context = ""
      if (analysis) {
        const ef = analysis.extractedFields
        context = `
PROVIDER: ${ef.provider}
INSURER: ${ef.insurer}
BILLED: ${ef.billedAmount}
INSURER PAID: ${ef.insurerPaid}
PATIENT RESPONSIBILITY: ${ef.patientResponsibility}
SERVICE DATE: ${ef.serviceDate}

DETECTED ISSUES:
${analysis.detectedIssues.map((i) => `- ${i.type}: ${i.description}`).join("\n")}

LEGAL CONTEXT (RELEVANT LAWS):
${analysis.laws.map((l) => `- ${l.title}: ${l.description}`).join("\n")}

DETAILED EXPLANATION:
${analysis.explanation}
`.trim()
      } else {
        context = "No specific medical bill is currently selected. Provide general advice about medical billing and disputes."
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setMessages((prev) => [...prev, { role: "assistant", content: data.content }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I had trouble connecting. Please try again." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold tracking-tight">NIPS AI Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-slate-800 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-4 scroll-smooth">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white border border-[var(--border)] text-slate-800 rounded-tl-none"
                    }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[var(--border)] rounded-2xl rounded-tl-none px-4 py-2 text-sm text-slate-500 flex items-center gap-2 shadow-sm">
                  <div className="flex gap-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce delay-100">.</span>
                    <span className="animate-bounce delay-200">.</span>
                  </div>
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border)] bg-white p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your bill..."
                className="flex-1 rounded-full border border-[var(--border)] bg-slate-50 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl transition-all hover:scale-110 active:scale-90 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-400 group relative ${isOpen ? "rotate-180" : ""
          }`}
        aria-label="Open Chat"
      >
        {isOpen ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <div className="relative">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-white"></span>
            </span>
          </div>
        )}

        {!isOpen && (
          <div className="absolute right-full mr-4 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 hidden sm:block shadow-xl">
            Ask NIPS AI
          </div>
        )}
      </button>
    </div>
  )
}
