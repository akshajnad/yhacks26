import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.75rem] font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[color-mix(in_srgb,var(--color-sage-100)_82%,var(--color-white)_18%)] text-[var(--color-teal-700)]",
        secondary: "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]",
        destructive: "border-transparent bg-[var(--destructive)] text-[var(--destructive-foreground)]",
        warning:
          "border-[color-mix(in_srgb,var(--color-coral-400)_28%,var(--color-stone-200)_72%)] bg-[color-mix(in_srgb,var(--color-coral-400)_10%,var(--color-white)_90%)] text-[var(--color-coral-500)]",
        error:
          "border-[color-mix(in_srgb,var(--color-coral-400)_28%,var(--color-stone-200)_72%)] bg-[color-mix(in_srgb,var(--color-coral-400)_12%,var(--color-white)_88%)] text-[var(--color-coral-500)]",
        outline:
          "border-[var(--border)] bg-[color-mix(in_srgb,var(--color-white)_74%,var(--color-stone-100)_26%)] text-[var(--color-ink-700)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
