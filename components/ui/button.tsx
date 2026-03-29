import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-soft)] hover:-translate-y-px hover:bg-[var(--color-teal-600)] active:translate-y-0 active:bg-[var(--color-teal-700)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-[var(--shadow-soft)] hover:-translate-y-px hover:bg-[var(--color-coral-500)]",
        outline:
          "border border-[var(--border)] bg-[color-mix(in_srgb,var(--color-white)_74%,var(--color-stone-100)_26%)] text-[var(--color-ink-900)] hover:-translate-y-px hover:bg-[var(--color-stone-100)]",
        secondary:
          "bg-[color-mix(in_srgb,var(--color-sage-100)_78%,var(--color-white)_22%)] text-[var(--color-teal-700)] hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--color-sage-100)_65%,var(--color-white)_35%)]",
        ghost: "text-[var(--color-ink-700)] hover:bg-[var(--accent)] hover:text-[var(--color-ink-900)]",
        link: "rounded-none px-0 text-[var(--color-teal-600)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[52px] px-5 py-2.5",
        sm: "h-10 px-4 text-[0.82rem]",
        lg: "h-[56px] px-6 text-[0.95rem]",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
