'use client'

import { useRef, useState, useCallback } from "react";

const PANEL_COUNT = 18;

const PANEL_IMAGES = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80",
  "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80",
  "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&q=80",
  "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=400&q=80",
];

export default function StackedPanels() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cursorX, setCursorX] = useState(0.5)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setCursorX((e.clientX - rect.left) / rect.width)
  }, [])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative h-[360px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-violet-600/30 to-fuchsia-500/20" />
      <div className="absolute inset-0 flex items-center justify-center [perspective:1200px]">
        {Array.from({ length: PANEL_COUNT }).map((_, i) => {
          const z = (i - PANEL_COUNT) * 35
          const offset = (i - PANEL_COUNT / 2) * 14
          const imageUrl = PANEL_IMAGES[i % PANEL_IMAGES.length]
          const distance = Math.abs(i / (PANEL_COUNT - 1) - cursorX)
          const wave = Math.max(0, 1 - distance * 3)
          return (
            <div
              key={i}
              className="absolute h-52 w-36 rounded-xl border border-white/30 bg-cover bg-center shadow-2xl transition-transform duration-300"
              style={{
                transform: `translate3d(${offset}px, ${-wave * 45}px, ${z}px) rotateY(${(cursorX - 0.5) * 12}deg)`,
                backgroundImage: `url(${imageUrl})`,
                opacity: 0.3 + i / PANEL_COUNT,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
