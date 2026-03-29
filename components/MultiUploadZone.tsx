"use client"

import { useCallback, useRef, useState } from "react"
import { FileStack, FileText, ShieldCheck, UploadCloud, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AnalysisResult } from "@/types/analysis"

interface MultiUploadZoneProps {
  onResult: (result: AnalysisResult) => void
  onError: (error: string) => void
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"]
const ACCEPTED_DISPLAY = "PDF, JPG, PNG, WebP"
const INVESTIGATION_STEPS = [
  "Reading the provider bill",
  "Reading the insurer response",
  "Comparing responsibility and denials",
  "Identifying likely billing issues",
  "Preparing the claim review workspace",
]

interface FileSlot {
  key: "bill" | "eob" | "denialLetter"
  label: string
  description: string
  detail: string
  required: boolean
}

const FILE_SLOTS: FileSlot[] = [
  {
    key: "bill",
    label: "Medical bill",
    description: "Upload the provider bill or statement.",
    detail: "This is the document we compare against the insurer response.",
    required: true,
  },
  {
    key: "eob",
    label: "Explanation of benefits",
    description: "Upload the EOB from your insurer.",
    detail: "This tells us what the plan says it covered and what may still be your responsibility.",
    required: true,
  },
  {
    key: "denialLetter",
    label: "Denial letter",
    description: "Add a denial letter if you received one.",
    detail: "Optional, but useful when coverage was rejected or a claim was closed.",
    required: false,
  },
]

export function MultiUploadZone({ onResult, onError }: MultiUploadZoneProps) {
  const [files, setFiles] = useState<Record<FileSlot["key"], File | null>>({
    bill: null,
    eob: null,
    denialLetter: null,
  })
  const [dragging, setDragging] = useState<FileSlot["key"] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [investigationStep, setInvestigationStep] = useState(0)
  const inputRefs = useRef<Record<FileSlot["key"], HTMLInputElement | null>>({
    bill: null,
    eob: null,
    denialLetter: null,
  })

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
    (slotKey: FileSlot["key"], file: File) => {
      if (!validateFile(file)) return
      setFiles((prev) => ({ ...prev, [slotKey]: file }))
      onError("")
    },
    [onError, validateFile]
  )

  const handleDrop = useCallback(
    (slotKey: FileSlot["key"], e: React.DragEvent) => {
      e.preventDefault()
      setDragging(null)
      const dropped = e.dataTransfer.files[0]
      if (dropped) handleFile(slotKey, dropped)
    },
    [handleFile]
  )

  const clearFile = (slotKey: FileSlot["key"]) => {
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

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="sage-panel p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-sage-300)_62%,var(--color-white)_38%)] text-[var(--color-teal-700)]">
              <FileStack className="h-5 w-5" />
            </div>
            <div>
              <div className="eyebrow">Review in progress</div>
              <h3 className="section-title mt-3 text-[1.55rem]">We are turning your documents into a claim review.</h3>
              <p className="body-copy mt-3">
                This usually takes under a minute. You will review the findings before any draft or next step is used.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {INVESTIGATION_STEPS.map((step, index) => {
              const complete = index < investigationStep
              const current = index === investigationStep

              return (
                <div
                  key={step}
                  className={cn(
                    "rounded-[1.2rem] border px-4 py-3 transition-colors",
                    current
                      ? "border-[color-mix(in_srgb,var(--color-teal-500)_22%,var(--color-stone-200)_78%)] bg-[color-mix(in_srgb,var(--color-white)_55%,var(--color-sage-100)_45%)]"
                      : "border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_76%,var(--color-stone-100)_24%)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                        complete || current
                          ? "bg-[var(--color-teal-500)] text-white"
                          : "bg-[var(--color-stone-200)] text-[var(--color-ink-700)]"
                      )}
                    >
                      {complete ? "✓" : index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink-900)]">{step}</p>
                      <p className="text-sm text-[var(--color-ink-700)]">
                        {current ? "Current step" : complete ? "Completed" : "Queued"}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          {FILE_SLOTS.map((slot) => {
            const file = files[slot.key]
            const isDragging = dragging === slot.key

            return (
              <div
                key={slot.key}
                className="rounded-[1.8rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_74%,var(--color-stone-100)_26%)] p-4 shadow-[var(--shadow-soft)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-[var(--color-ink-900)]">{slot.label}</h3>
                      <span className={cn("status-chip", slot.required ? "teal" : "stone")}>
                        {slot.required ? "Required" : "Optional"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-ink-700)]">{slot.description}</p>
                    <p className="mt-1 text-sm text-[var(--color-ink-500)]">{slot.detail}</p>
                  </div>
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
                    "mt-4 rounded-[1.5rem] border border-dashed px-5 py-6 transition-colors",
                    isDragging
                      ? "border-[var(--color-teal-500)] bg-[color-mix(in_srgb,var(--color-sage-100)_65%,var(--color-white)_35%)]"
                      : file
                        ? "border-[color-mix(in_srgb,var(--color-teal-500)_28%,var(--color-stone-200)_72%)] bg-[color-mix(in_srgb,var(--color-white)_58%,var(--color-sage-100)_42%)]"
                        : "border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_68%,var(--color-stone-50)_32%)] hover:border-[var(--color-teal-500)] hover:bg-[color-mix(in_srgb,var(--color-sage-100)_38%,var(--color-white)_62%)]"
                  )}
                >
                  <input
                    ref={(el) => {
                      inputRefs.current[slot.key] = el
                    }}
                    type="file"
                    accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const selected = e.target.files?.[0]
                      if (selected) handleFile(slot.key, selected)
                    }}
                  />

                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-white)_46%,var(--color-stone-100)_54%)] text-[var(--color-teal-700)]">
                      {file ? <FileText className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      {file ? (
                        <>
                          <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">{file.name}</p>
                          <p className="mt-1 text-sm text-[var(--color-ink-700)]">
                            {(file.size / 1024).toFixed(0)} KB · ready to review
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-[var(--color-ink-900)]">Drop a file here or click to browse.</p>
                          <p className="mt-1 text-sm text-[var(--color-ink-700)]">
                            Accepted file types: {ACCEPTED_DISPLAY}. Maximum file size: 20MB.
                          </p>
                        </>
                      )}
                    </div>

                    {file ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearFile(slot.key)
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_68%,var(--color-stone-100)_32%)] text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-stone-100)]"
                        aria-label={`Remove ${slot.label}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <aside className="sage-panel flex flex-col justify-between p-5 md:p-6">
          <div>
            <div className="eyebrow">What happens next</div>
            <h3 className="section-title mt-3 text-[1.45rem]">We turn the documents into a guided case review.</h3>
            <ul className="mt-4 space-y-3">
              {[
                "We normalize the bill and EOB into one claim view.",
                "We flag likely issues such as duplicate charges and mismatched responsibility.",
                "You review findings before any dispute draft is used.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-[var(--color-ink-700)]">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--color-teal-500)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-[1.35rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_62%,var(--color-stone-100)_38%)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-900)]">
              <ShieldCheck className="h-4 w-4 text-[var(--color-teal-700)]" />
              Privacy note
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--color-ink-700)]">
              Files are only used to prepare your claim review and recommended next steps in this workspace.
            </p>
          </div>
        </aside>
      </div>

      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_74%,var(--color-stone-100)_26%)] p-5 shadow-[var(--shadow-soft)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink-900)]">
            {canAnalyze ? "Ready to begin review." : "Add the bill and EOB to begin review."}
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-700)]">
            The first result you should expect is clarity: what is wrong, why it matters, and what comes next.
          </p>
        </div>
        <Button size="lg" onClick={handleAnalyze} disabled={!canAnalyze}>
          Begin review
        </Button>
      </div>
    </div>
  )
}
