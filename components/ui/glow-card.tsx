"use client"

import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function GlowCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-white/95 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        className
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-blue-500/20 blur-2xl" />
        <div className="absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
      </div>
      <div className="relative z-10">{props.children}</div>
    </div>
  )
}
