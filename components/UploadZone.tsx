"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AnalysisResult } from "@/types/analysis"

interface UploadZoneProps {
  onResult: (result: AnalysisResult) => void
  onError: (error: string) => void
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"]
const ACCEPTED_DISPLAY = "PDF, JPG, PNG, WebP"

export function UploadZone({ onResult, onError }: UploadZoneProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      onError(`Unsupported file type: ${f.type}. Please upload a ${ACCEPTED_DISPLAY} file.`)
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      onError("File is too large. Maximum size is 20MB.")
      return
    }
    setFile(f)
  }, [onError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, [handleFile])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  const handleAnalyze = async () => {
    if (!file) return
    setIsLoading(true)
    onError("")

    try {
      const formData = new FormData()
      formData.append("file", file)

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
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-all duration-200",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : file
            ? "border-green-400 bg-green-50"
            : "border-[var(--border)] bg-[var(--muted)] hover:border-blue-400 hover:bg-blue-50/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
          <UploadIcon />
        </div>

        {file ? (
          <div className="text-center">
            <p className="font-medium text-green-700">{file.name}</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              {(file.size / 1024).toFixed(0)} KB — ready to analyze
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-medium text-[var(--foreground)]">
              Drop your medical bill or EOB here
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              or click to browse &mdash; {ACCEPTED_DISPLAY}, up to 20MB
            </p>
          </div>
        )}
      </div>

      {/* Analyze button */}
      <Button
        onClick={handleAnalyze}
        disabled={!file || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <SpinnerIcon />
            Analyzing with Gemini...
          </span>
        ) : (
          "Analyze Bill"
        )}
      </Button>

      {file && !isLoading && (
        <button
          onClick={() => {
            setFile(null)
            if (inputRef.current) inputRef.current.value = ""
          }}
          className="w-full text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          Clear and upload a different file
        </button>
      )}
    </div>
  )
}

function UploadIcon() {
  return (
    <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
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
