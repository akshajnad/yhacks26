"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AnalysisResult } from "@/types/analysis"

interface MultiUploadZoneProps {
  onResult: (result: AnalysisResult) => void
  onError: (error: string) => void
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"]
const ACCEPTED_DISPLAY = "PDF, JPG, PNG, WebP"

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
    onError("")

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
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {FILE_SLOTS.map((slot) => {
        const file = files[slot.key]
        const isDragging = dragging === slot.key

        return (
          <div key={slot.key}>
            <div className="mb-1.5 flex items-center gap-2">
              <p className="text-sm font-medium text-slate-900">{slot.label}</p>
              {slot.required ? (
                <span className="text-xs font-medium text-red-500">Required</span>
              ) : (
                <span className="text-xs text-slate-400">Optional</span>
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
                "relative flex items-center gap-4 rounded-lg border-2 border-dashed px-5 py-4 transition-all duration-200 cursor-pointer",
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : file
                  ? "border-green-400 bg-green-50"
                  : "border-[var(--border)] bg-[var(--muted)] hover:border-blue-400 hover:bg-blue-50/50"
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
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  file ? "bg-green-100" : "bg-blue-100"
                )}
              >
                {file ? <CheckCircleIcon /> : <UploadSmallIcon />}
              </div>

              <div className="min-w-0 flex-1">
                {file ? (
                  <>
                    <p className="truncate text-sm font-medium text-green-700">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">{slot.description}</p>
                    <p className="text-xs text-slate-400">
                      Drop file or click to browse &mdash; {ACCEPTED_DISPLAY}
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
                  className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                  aria-label={`Remove ${slot.label}`}
                >
                  <XIcon />
                </button>
              )}
            </div>
          </div>
        )
      })}

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
          "Analyze Documents"
        )}
      </Button>
    </div>
  )
}

function UploadSmallIcon() {
  return (
    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
