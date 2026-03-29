import { cn } from "@/lib/utils"

interface StackedPanelsProps {
  className?: string
}

export function StackedPanels({ className }: StackedPanelsProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <div className="absolute -left-12 top-10 h-56 w-72 rotate-[-12deg] rounded-3xl border border-blue-200/70 bg-white/60 shadow-lg backdrop-blur" />
      <div className="absolute left-14 top-20 h-52 w-80 rotate-[-4deg] rounded-3xl border border-violet-200/60 bg-gradient-to-br from-white to-blue-50/70 shadow-xl" />
      <div className="absolute left-24 top-32 h-52 w-72 rotate-[6deg] rounded-3xl border border-slate-200/80 bg-white/70 shadow-lg" />
      <div className="absolute right-8 top-14 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />
    </div>
  )
}
