'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

type SpotlightProps = {
  className?: string;
  size?: number;
};

export function CursorSpotlight({ className, size = 200 }: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [parentElement, setParentElement] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const parent = containerRef.current.parentElement;
      if (parent) {
        parent.style.position = 'relative';
        parent.style.overflow = 'hidden';
        setParentElement(parent);
      }
    }
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!parentElement) return;
    const { left, top } = parentElement.getBoundingClientRect();
    setPos({ x: event.clientX - left, y: event.clientY - top });
  }, [parentElement]);

  useEffect(() => {
    if (!parentElement) return;

    const enter = () => setIsHovered(true);
    const leave = () => setIsHovered(false);

    parentElement.addEventListener('mousemove', handleMouseMove);
    parentElement.addEventListener('mouseenter', enter);
    parentElement.addEventListener('mouseleave', leave);

    return () => {
      parentElement.removeEventListener('mousemove', handleMouseMove);
      parentElement.removeEventListener('mouseenter', enter);
      parentElement.removeEventListener('mouseleave', leave);
    };
  }, [parentElement, handleMouseMove]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'pointer-events-none absolute rounded-full bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops),transparent_80%)] blur-xl transition-opacity duration-200',
        'from-zinc-50 via-zinc-100 to-zinc-200',
        isHovered ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{
        width: size,
        height: size,
        left: `${pos.x - size / 2}px`,
        top: `${pos.y - size / 2}px`,
      }}
    />
  );
}
