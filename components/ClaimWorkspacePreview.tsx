"use client"

import { ArrowRight, FileText, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const reviewRows = [
  {
    label: "Emergency department visit",
    billed: "$1,280",
    responsibility: "$420",
    status: "Issue found",
  },
  {
    label: "Facility fee",
    billed: "$860",
    responsibility: "$0",
    status: "Corrected",
  },
  {
    label: "Duplicate lab charge",
    billed: "$190",
    responsibility: "$190",
    status: "Needs review",
  },
]

const stages = ["Uploaded", "Reviewing", "Issues found", "Draft ready", "Submitted"]

export function ClaimWorkspacePreview({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate overflow-hidden rounded-[2rem] border border-[var(--color-stone-200)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-white)_78%,var(--color-stone-100)_22%)_0%,color-mix(in_srgb,var(--color-sage-100)_42%,var(--color-white)_58%)_100%)] p-4 shadow-[var(--shadow-soft)]",
        compact ? "max-w-[58rem]" : "max-w-[64rem]"
      )}
    >
      <div className="pointer-events-none absolute inset-x-12 top-0 h-32 rounded-full bg-[color-mix(in_srgb,var(--color-gold-300)_20%,transparent)] blur-3xl" />
      <div
        className={cn(
          "relative grid items-start gap-4",
          compact ? "lg:grid-cols-[13rem_minmax(0,1fr)]" : "md:grid-cols-[15rem_minmax(0,1fr)]"
        )}
      >
        <div className="hero-bill relative mt-8 rounded-[1.75rem] border border-[color-mix(in_srgb,var(--color-stone-200)_72%,var(--color-white)_28%)] bg-[color-mix(in_srgb,var(--color-white)_92%,var(--color-stone-50)_8%)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
            <span>Provider bill</span>
            <span>May 14</span>
          </div>
          <div className="mt-5 space-y-3">
            <div className="space-y-1.5 rounded-[1.15rem] border border-[var(--color-stone-200)] bg-[var(--color-stone-50)] p-3">
              <div className="h-2 rounded-full bg-[var(--color-stone-200)]" />
              <div className="h-2 w-3/4 rounded-full bg-[var(--color-stone-200)]" />
            </div>
            <div className="rounded-[1.15rem] border border-[color-mix(in_srgb,var(--color-coral-400)_35%,var(--color-white)_65%)] bg-[color-mix(in_srgb,var(--color-coral-400)_10%,var(--color-white)_90%)] p-3">
              <div className="flex items-center justify-between text-sm text-[var(--color-ink-900)]">
                <span>Duplicate lab charge</span>
                <span>$190</span>
              </div>
              <div className="mt-2 h-1.5 w-3/4 rounded-full bg-[color-mix(in_srgb,var(--color-coral-400)_45%,var(--color-white)_55%)]" />
            </div>
            <div className="space-y-1.5 rounded-[1.15rem] border border-[var(--color-stone-200)] bg-[var(--color-stone-50)] p-3">
              <div className="h-2 rounded-full bg-[var(--color-stone-200)]" />
              <div className="h-2 w-2/3 rounded-full bg-[var(--color-stone-200)]" />
            </div>
          </div>
          <div className="mt-5 rounded-[1.15rem] bg-[var(--color-stone-100)] px-3 py-2.5">
            <div className="text-[0.72rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">Patient due</div>
            <div className="mt-1 font-[family:var(--font-display)] text-[1.75rem] leading-none text-[var(--color-ink-900)]">
              $610
            </div>
          </div>
        </div>

        <div className="hero-workbench relative overflow-hidden rounded-[2rem] border border-[color-mix(in_srgb,var(--color-stone-200)_78%,var(--color-white)_22%)] bg-[color-mix(in_srgb,var(--color-white)_92%,var(--color-stone-50)_8%)] p-4 shadow-[var(--shadow-medium)] md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-stone-200)] pb-4">
            <div>
              <div className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Claim review workspace
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-[var(--color-ink-700)]">
                <FileText className="h-4 w-4 text-[var(--color-teal-500)]" />
                Bill aligned to insurer response
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--color-teal-500)_16%,var(--color-white)_84%)] bg-[color-mix(in_srgb,var(--color-sage-100)_82%,var(--color-white)_18%)] px-3 py-1.5 text-[0.8rem] font-semibold text-[var(--color-teal-700)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Ready for review
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_18rem]">
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {stages.map((stage, index) => {
                  const isActive = index <= 2
                  return (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full border",
                            isActive
                              ? "border-[var(--color-teal-500)] bg-[var(--color-teal-500)]"
                              : "border-[var(--color-stone-200)] bg-[var(--color-stone-50)]"
                          )}
                        />
                        <span
                          className={cn(
                            "hidden h-px flex-1 md:block",
                            index === stages.length - 1
                              ? "opacity-0"
                              : isActive
                                ? "bg-[var(--color-teal-500)]"
                                : "bg-[var(--color-stone-200)]"
                          )}
                        />
                      </div>
                      <div className="text-[0.72rem] text-[var(--color-ink-500)]">{stage}</div>
                    </div>
                  )
                })}
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--color-stone-200)] bg-[var(--color-stone-50)]">
                <div className="grid grid-cols-[minmax(0,1.65fr)_0.7fr_0.8fr_0.9fr] gap-3 border-b border-[var(--color-stone-200)] px-4 py-3 text-[0.72rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                  <span>Charge</span>
                  <span>Billed</span>
                  <span>Patient</span>
                  <span>Status</span>
                </div>
                {reviewRows.map((row, index) => (
                  <div
                    key={row.label}
                    className={cn(
                      "grid grid-cols-[minmax(0,1.65fr)_0.7fr_0.8fr_0.9fr] gap-3 px-4 py-3 text-sm",
                      index !== reviewRows.length - 1 && "border-b border-[var(--color-stone-200)]"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[var(--color-ink-900)]">{row.label}</div>
                      <div className="mt-1 text-[0.82rem] text-[var(--color-ink-500)]">May 14, 2026</div>
                    </div>
                    <div className="font-medium text-[var(--color-ink-700)]">{row.billed}</div>
                    <div className="font-medium text-[var(--color-ink-700)]">{row.responsibility}</div>
                    <div>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[0.74rem] font-semibold",
                          row.status === "Issue found"
                            ? "bg-[color-mix(in_srgb,var(--color-coral-400)_12%,var(--color-white)_88%)] text-[var(--color-coral-500)]"
                            : row.status === "Corrected"
                              ? "bg-[color-mix(in_srgb,var(--color-sage-100)_86%,var(--color-white)_14%)] text-[var(--color-teal-700)]"
                              : "bg-[var(--color-stone-100)] text-[var(--color-ink-700)]"
                        )}
                      >
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-[1.5rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_84%,var(--color-sage-100)_16%)] p-4">
              <div className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Why this matters
              </div>
              <h3 className="mt-3 font-[family:var(--font-display)] text-[1.5rem] leading-[1.08] text-[var(--color-ink-900)]">
                This charge may be duplicated.
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-ink-700)]">
                We found two line items with the same provider, service date, and service description.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--color-ink-700)]">
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--color-coral-400)]" />
                  <span>Bill total appears to overstate your responsibility by $190.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--color-teal-500)]" />
                  <span>The claim draft asks the provider to correct the duplicate before submission.</span>
                </li>
              </ul>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-teal-700)]">
                Review evidence
                <ArrowRight className="h-4 w-4" />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
