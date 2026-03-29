import React, { useEffect, useRef, ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 }
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96'
};

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'blue',
  size = 'md',
  width,
  height,
  customSize = false
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncPointer = (e: PointerEvent) => {
      const { clientX: x, clientY: y } = e;
      if (cardRef.current) {
        cardRef.current.style.setProperty('--x', x.toFixed(2));
        cardRef.current.style.setProperty('--xp', (x / window.innerWidth).toFixed(2));
        cardRef.current.style.setProperty('--y', y.toFixed(2));
        cardRef.current.style.setProperty('--yp', (y / window.innerHeight).toFixed(2));
      }
    };

    document.addEventListener('pointermove', syncPointer);
    return () => document.removeEventListener('pointermove', syncPointer);
  }, []);

  const { base, spread } = glowColorMap[glowColor];

  const getSizeClasses = () => {
    if (customSize) return '';
    return sizeMap[size];
  };

  const getInlineStyles = () => {
    const baseStyles: React.CSSProperties = {
      ['--base' as never]: base,
      ['--spread' as never]: spread,
      ['--radius' as never]: '14',
      ['--border' as never]: '2',
      ['--backdrop' as never]: 'hsl(0 0% 100% / 0.9)',
      ['--backup-border' as never]: 'hsl(220 18% 90%)',
      ['--size' as never]: '220',
      ['--outer' as never]: '1',
      ['--border-size' as never]: 'calc(var(--border, 2) * 1px)',
      ['--spotlight-size' as never]: 'calc(var(--size, 150) * 1px)',
      ['--hue' as never]: 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
      backgroundImage: `radial-gradient(
        var(--spotlight-size) var(--spotlight-size) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(var(--hue, 210) 100% 70% / 0.14), transparent
      )`,
      backgroundColor: 'var(--backdrop, transparent)',
      border: 'var(--border-size) solid var(--backup-border)',
      position: 'relative',
      touchAction: 'none',
    };

    if (width !== undefined) baseStyles.width = typeof width === 'number' ? `${width}px` : width;
    if (height !== undefined) baseStyles.height = typeof height === 'number' ? `${height}px` : height;

    return baseStyles;
  };

  return (
    <div
      ref={cardRef}
      style={getInlineStyles()}
      className={`${getSizeClasses()} ${!customSize ? 'aspect-[3/4]' : ''} rounded-2xl relative p-4 md:p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.55)] transition-transform duration-300 hover:scale-[1.02] ${className}`}
    >
      {children}
    </div>
  );
};

export { GlowCard };
