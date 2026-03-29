"use client"

import Link from "next/link"
import { ArrowRight, FileSearch, FolderClock, ScrollText, ShieldCheck, Upload } from "lucide-react"
import { useAuth0 } from "@auth0/auth0-react"
import { Button } from "@/components/ui/button"
import { ClaimWorkspacePreview } from "@/components/ClaimWorkspacePreview"

const checks = [
  {
    title: "Duplicate charges",
    body: "We compare line items across the bill and insurer response so repeated services are easier to spot.",
    note: "A repeated lab charge is marked only where the issue appears.",
  },
  {
    title: "Incorrect out-of-network coding",
    body: "We call out network mismatches when a provider bill does not match the way your plan processed care.",
    note: "The workspace shows the coding question before asking you to take action.",
  },
  {
    title: "Denied coverage worth challenging",
    body: "When coverage was denied, we surface the reason in plain language and point to the strongest next step.",
    note: "Denials are framed as reviewable evidence, not panic alerts.",
  },
  {
    title: "Missing plan-language alignment",
    body: "We flag when the bill does not seem to line up with what the insurer says your responsibility should be.",
    note: "Each finding comes with a concise explanation panel and a drafted response path.",
  },
]

const processStages = [
  {
    title: "Upload the bill and insurer response",
    body: "Bring in the provider statement, EOB, and denial letter if you have one. The upload flow explains what each document does before asking for it.",
    accent: "Your case begins as documents, not jargon.",
    icon: Upload,
  },
  {
    title: "We identify likely errors and missing evidence",
    body: "The audit engine translates the documents into a review table so you can see where the bill, payment, and patient responsibility diverge.",
    accent: "You see what was found, why it matters, and what still needs confirmation.",
    icon: FileSearch,
  },
  {
    title: "We draft the claim with supporting language",
    body: "Provider disputes, insurer appeals, and guided calls are generated from the audit result and grounded in the case details you approve.",
    accent: "The tone stays specific, calm, and reviewable.",
    icon: ScrollText,
  },
  {
    title: "You review and approve",
    body: "Nothing is sent automatically. You can edit details, confirm contacts, and understand the logic behind each recommendation before moving forward.",
    accent: "The product explains before it asks.",
    icon: ShieldCheck,
  },
  {
    title: "We track the response and next steps",
    body: "The case history remains readable: what was uploaded, what was found, what was drafted, and what still needs a response.",
    accent: "Progress stays visible so you never feel behind.",
    icon: FolderClock,
  },
]

const controlPoints = [
  "Clear explanations for every issue found",
  "Progress visible at every step",
  "Simple records of documents and insurer responses",
  "A case history you can read without learning billing software",
]

export default function Home() {
  const { user, loginWithRedirect, isLoading } = useAuth0()

  return (
    <div className="overflow-hidden">
      <section className="section-shell pb-20 pt-10 md:pb-24 md:pt-16">
        <div className="grid gap-12 xl:grid-cols-[minmax(0,33rem)_minmax(0,1fr)] xl:items-center">
          <div className="copy-column">
            <p className="eyebrow">Medical bill claims, explained clearly</p>
            <h1 className="display-hero mt-5 text-balance">
              Your medical bill, made understandable and fair.
            </h1>
            <p className="lede mt-6">
              We review charges, flag what looks wrong, and help build the claim so you can move forward with confidence.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {!isLoading && user ? (
                <Button asChild size="lg">
                  <Link href="/analysis/new">Start your claim</Link>
                </Button>
              ) : !isLoading ? (
                <Button size="lg" onClick={() => loginWithRedirect()}>
                  Start your claim
                </Button>
              ) : (
                <div className="h-14 w-36 animate-pulse rounded-full bg-[var(--color-stone-100)]" />
              )}
              <Button asChild variant="outline" size="lg">
                <Link href="#process">See how it works</Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <ValuePoint title="Explain first" body="Every action starts with context in plain language." />
              <ValuePoint title="Review before sending" body="You stay informed and in control." />
              <ValuePoint title="Built for stressed moments" body="The product reduces noise instead of adding urgency." />
            </div>
          </div>

          <ClaimWorkspacePreview />
        </div>
      </section>

      <section className="wash-section">
        <div className="section-shell">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <div className="copy-column">
              <p className="eyebrow">What we check</p>
              <h2 className="display-md mt-4 text-balance">Useful immediately, not hidden behind a sales pitch.</h2>
              <p className="body-copy mt-5">
                The first job is clarity. Each finding is translated into a calm explanation so the bill becomes a case you can actually review.
              </p>
            </div>

            <div className="border-t border-[var(--color-stone-200)]">
              {checks.map((item) => (
                <div
                  key={item.title}
                  className="grid gap-4 border-b border-[var(--color-stone-200)] py-6 md:grid-cols-[minmax(0,1fr)_18rem]"
                >
                  <div>
                    <h3 className="section-title text-[1.35rem]">{item.title}</h3>
                    <p className="body-copy mt-3 text-[0.98rem]">{item.body}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-[color-mix(in_srgb,var(--color-coral-400)_18%,var(--color-stone-200)_82%)] bg-[color-mix(in_srgb,var(--color-white)_76%,var(--color-stone-100)_24%)] p-4">
                    <div className="text-[0.72rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">Claim annotation</div>
                    <p className="mt-3 text-sm leading-6 text-[var(--color-ink-700)]">{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="process" className="section-shell">
        <div className="grid gap-10 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">How the process works</p>
            <h2 className="display-md mt-4 text-balance">A guided claim flow that keeps the next step legible.</h2>
            <p className="body-copy mt-5">
              The aha moment is simple: the bill stops feeling like an opaque demand and starts reading like a case with evidence, status, and a clear next action.
            </p>
          </div>

          <div className="space-y-6">
            {processStages.map((stage, index) => {
              const Icon = stage.icon
              return (
                <div
                  key={stage.title}
                  className="grid gap-5 rounded-[2rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_78%,var(--color-stone-50)_22%)] p-5 shadow-[var(--shadow-soft)] md:grid-cols-[auto_minmax(0,1fr)] md:p-7"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-sage-100)_82%,var(--color-white)_18%)] text-[var(--color-teal-700)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[0.72rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                      Step {index + 1}
                    </div>
                    <h3 className="section-title mt-3 text-[1.5rem]">{stage.title}</h3>
                    <p className="body-copy mt-3">{stage.body}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-teal-700)]">
                      {stage.accent}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="wash-section">
        <div className="section-shell">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] lg:items-center">
            <div className="copy-column">
              <p className="eyebrow">You stay in control</p>
              <h2 className="display-md mt-4 text-balance">Supportive when things are stressful, meticulous when details matter.</h2>
              <p className="body-copy mt-5">
                The product is designed for people who are tired, uncertain, or handling paperwork for someone else. It uses progress, explanation, and readable records to lower the load.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="paper-panel p-6 md:p-7">
                <div className="text-[0.72rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">Case history</div>
                <div className="mt-4 space-y-4">
                  {[
                    ["Uploaded", "Bill, EOB, denial letter received"],
                    ["Issues found", "Duplicate charge and denial mismatch surfaced"],
                    ["Draft ready", "Provider dispute email prepared for review"],
                  ].map(([label, detail], index) => (
                    <div key={label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-[var(--color-teal-500)]" />
                        {index < 2 ? <div className="mt-2 h-10 w-px bg-[var(--color-stone-200)]" /> : null}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink-900)]">{label}</p>
                        <p className="mt-1 text-sm text-[var(--color-ink-700)]">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sage-panel p-6">
                <div className="text-[0.72rem] uppercase tracking-[0.16em] text-[var(--color-ink-500)]">What you can expect</div>
                <ul className="mt-4 space-y-3">
                  {controlPoints.map((point) => (
                    <li key={point} className="flex gap-3 text-sm leading-6 text-[var(--color-ink-700)]">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--color-gold-300)]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-[1.2rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_72%,var(--color-stone-100)_28%)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-ink-900)]">Nothing is submitted without your review.</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-ink-700)]">
                    The workspace is built for beginners to claims and appeals, so the system teaches the path while you use it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="rounded-[2rem] border border-[var(--color-stone-200)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-sage-100)_68%,var(--color-white)_32%)_0%,color-mix(in_srgb,var(--color-stone-50)_72%,var(--color-stone-100)_28%)_100%)] px-6 py-10 shadow-[var(--shadow-soft)] md:px-10 md:py-12">
          <p className="eyebrow">Start with the bill</p>
          <h2 className="display-md mt-4 text-balance">We will help with the rest.</h2>
          <p className="body-copy mt-5 max-w-[36rem]">
            Upload your documents, understand what is wrong, and move forward with a claim that is easier to trust.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {!isLoading && user ? (
              <>
                <Button asChild size="lg">
                  <Link href="/analysis/new">Begin a claim</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/dashboard">Open your cases</Link>
                </Button>
              </>
            ) : !isLoading ? (
              <>
                <Button size="lg" onClick={() => loginWithRedirect()}>
                  Begin a claim
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="#process">See the process</Link>
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}

function ValuePoint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.4rem] border border-[var(--color-stone-200)] bg-[color-mix(in_srgb,var(--color-white)_74%,var(--color-stone-100)_26%)] p-4">
      <p className="text-sm font-semibold text-[var(--color-ink-900)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--color-ink-700)]">{body}</p>
    </div>
  )
}
