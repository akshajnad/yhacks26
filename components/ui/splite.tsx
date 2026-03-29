'use client'

interface SplineSceneProps {
  scene: string
  className?: string
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <div className={className}>
      <iframe
        src={scene}
        className="h-full w-full border-0"
        title="Spline scene"
        loading="lazy"
        allow="fullscreen"
      />
    </div>
  )
}
