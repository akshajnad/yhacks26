"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface CollapsibleCardProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export function CollapsibleCard({ title, icon, children, defaultOpen = true, className }: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn("rounded-xl border border-[var(--border)] bg-white shadow-sm transition-all duration-300 hover:shadow-md", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-base font-semibold text-slate-900">
          {icon}
          {title}
        </span>
        <span className={cn("text-slate-500 transition-transform duration-300", open ? "rotate-180" : "rotate-0")}>⌄</span>
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="px-5 pb-5">{children}</div>
        </div>
      </div>
    </div>
  )
}
