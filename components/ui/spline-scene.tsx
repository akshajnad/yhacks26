import { cn } from "@/lib/utils"

interface SplineSceneProps {
  className?: string
  sceneUrl?: string
}

export function SplineScene({ className, sceneUrl }: SplineSceneProps) {
  if (!sceneUrl) {
    return (
      <div className={cn("relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-slate-900 via-blue-900 to-violet-900", className)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(96,165,250,0.4),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_70%,rgba(167,139,250,0.35),transparent_50%)]" />
        <div className="absolute inset-0 backdrop-blur-[1px]" />
      </div>
    )
  }

  return (
    <iframe
      src={sceneUrl}
      className={cn("h-full w-full rounded-2xl border border-[var(--border)]", className)}
      title="MedBill Agent 3D Scene"
      loading="lazy"
      allow="fullscreen"
    />
  )
}
