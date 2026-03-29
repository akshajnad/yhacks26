"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { GlowCard } from "@/components/ui/glow-card"
import { cn } from "@/lib/utils"
import type { AnalysisResult } from "@/types/analysis"

interface MultiUploadZoneProps {
  onResult: (result: AnalysisResult) => void
  onError: (error: string) => void
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"]
const ACCEPTED_DISPLAY = "PDF, JPG, PNG, WebP"
const INVESTIGATION_STEPS = [
  "Parsing medical bill",
  "Parsing insurance EOB",
  "Comparing billing chain",
  "Identifying likely issues",
  "Generating recommended next steps",
]

interface FileSlot {
  key: "bill" | "eob" | "denialLetter"
  label: string
  description: string
  required: boolean
}

const FILE_SLOTS: FileSlot[] = [
  { key: "bill", label: "Medical Bill", description: "Upload your medical bill or statement", required: true },
  { key: "eob", label: "Explanation of Benefits (EOB)", description: "Upload the EOB from your insurer", required: true },
  { key: "denialLetter", label: "Denial Letter", description: "Upload if your claim was denied", required: false },
]

export function MultiUploadZone({ onResult, onError }: MultiUploadZoneProps) {
  const [files, setFiles] = useState<Record<string, File | null>>({
    bill: null,
    eob: null,
    denialLetter: null,
  })
  const [dragging, setDragging] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [investigationStep, setInvestigationStep] = useState(0)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const canAnalyze = files.bill !== null && files.eob !== null && !isLoading

  const validateFile = useCallback(
    (file: File): boolean => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        onError(`Unsupported file type: ${file.type}. Please upload a ${ACCEPTED_DISPLAY} file.`)
        return false
      }
      if (file.size > 20 * 1024 * 1024) {
        onError("File is too large. Maximum size is 20MB.")
        return false
      }
      return true
    },
    [onError]
  )

  const handleFile = useCallback(
    (slotKey: string, file: File) => {
      if (!validateFile(file)) return
      setFiles((prev) => ({ ...prev, [slotKey]: file }))
      onError("")
    },
    [validateFile, onError]
  )

  const handleDrop = useCallback(
    (slotKey: string, e: React.DragEvent) => {
      e.preventDefault()
      setDragging(null)
      const dropped = e.dataTransfer.files[0]
      if (dropped) handleFile(slotKey, dropped)
    },
    [handleFile]
  )

  const clearFile = (slotKey: string) => {
    setFiles((prev) => ({ ...prev, [slotKey]: null }))
    const input = inputRefs.current[slotKey]
    if (input) input.value = ""
  }

  const handleAnalyze = async () => {
    if (!canAnalyze) return
    setIsLoading(true)
    setInvestigationStep(0)
    onError("")
    const progressTimer = window.setInterval(() => {
      setInvestigationStep((prev) => Math.min(prev + 1, INVESTIGATION_STEPS.length - 1))
    }, 1200)

    try {
      const formData = new FormData()
      formData.append("bill", files.bill!)
      formData.append("eob", files.eob!)
      if (files.denialLetter) {
        formData.append("denialLetter", files.denialLetter)
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? `Server error: ${res.status}`)
      }

      onResult(data as AnalysisResult)
    } catch (err) {
      onError(err instanceof Error ? err.message : "Analysis failed. Please try again.")
    } finally {
      window.clearInterval(progressTimer)
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {isLoading ? (
        <GlowCard className="animate-fade-up border-blue-100 bg-gradient-to-b from-blue-50 to-white p-5">
          <div className="flex items-center gap-2">
            <SpinnerIcon />
            <p className="text-sm font-semibold text-slate-900">Investigating billing documents</p>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Running the audit workflow now. This usually takes 30-60 seconds.
          </p>
          <div className="mt-4 space-y-2">
            {INVESTIGATION_STEPS.map((step, idx) => {
              const isDone = idx < investigationStep
              const isCurrent = idx === investigationStep
              return (
                <div
                  key={step}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all duration-300 ${
                    isCurrent
                      ? "border-blue-200 bg-blue-50 text-blue-900"
                      : isDone
                        ? "border-slate-200 bg-white text-slate-700"
                        : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      isCurrent ? "bg-blue-600 text-white" : isDone ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isDone ? "✓" : idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              )
            })}
          </div>
        </GlowCard>
      ) : null}

      {!isLoading ? (
        <>
          {FILE_SLOTS.map((slot) => {
            const file = files[slot.key]
            const isDragging = dragging === slot.key

            return (
              <GlowCard key={slot.key} className="animate-fade-up p-3">
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{slot.label}</p>
                  {slot.required ? (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                      Required
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500">
                      Optional
                    </span>
                  )}
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => inputRefs.current[slot.key]?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      inputRefs.current[slot.key]?.click()
                    }
                  }}
                  onDrop={(e) => handleDrop(slot.key, e)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(slot.key)
                  }}
                  onDragLeave={() => setDragging(null)}
                  className={cn(
                    "group relative flex cursor-pointer items-center gap-4 rounded-xl border border-dashed px-4 py-4 transition-all duration-300",
                    isDragging
                      ? "border-blue-500 bg-blue-50 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                      : file
                        ? "border-blue-300 bg-white shadow-sm"
                        : "border-[var(--border)] bg-white hover:border-blue-300 hover:bg-slate-50"
                  )}
                >
                  <input
                    ref={(el) => { inputRefs.current[slot.key] = el }}
                    type="file"
                    accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const selected = e.target.files?.[0]
                      if (selected) handleFile(slot.key, selected)
                    }}
                  />

                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-transform duration-300 group-hover:scale-105",
                      file ? "bg-blue-100" : "bg-slate-100"
                    )}
                  >
                    {file ? <CheckCircleIcon /> : <UploadSmallIcon />}
                  </div>

                  <div className="min-w-0 flex-1">
                    {file ? (
                      <>
                        <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-600">
                          {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-slate-700">{slot.description}</p>
                        <p className="text-xs text-slate-500">
                          Drop file or click to browse - {ACCEPTED_DISPLAY}
                        </p>
                      </>
                    )}
                  </div>

                  {file && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        clearFile(slot.key)
                      }}
                      className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label={`Remove ${slot.label}`}
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              </GlowCard>
            )
          })}
        </>
      ) : null}

      <Button
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <SpinnerIcon />
            Analyzing documents... this may take 30-60 seconds
          </span>
        ) : (
          "Run Analysis"
        )}
      </Button>
    </div>
  )
}

function UploadSmallIcon() {
  return (
    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
