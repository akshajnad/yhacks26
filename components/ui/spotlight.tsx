"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface SpotlightProps {
  className?: string
}

export function Spotlight({ className }: SpotlightProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 })

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 100
      const y = (event.clientY / window.innerHeight) * 100
      setPosition({ x, y })
    }

    window.addEventListener("mousemove", handler)
    return () => window.removeEventListener("mousemove", handler)
  }, [])

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 -z-10 transition-all duration-300", className)}
      style={{
        background: `radial-gradient(600px circle at ${position.x}% ${position.y}%, rgba(59,130,246,0.15), transparent 45%)`,
      }}
    />
  )
}
