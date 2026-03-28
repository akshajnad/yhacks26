/* eslint-disable @next/next/no-html-link-for-pages */
import { auth0 } from "@/lib/auth0"

const steps = [
  {
    title: "Upload bill + EOB",
    description: "Parse provider bills and insurer EOBs into normalized claim data.",
  },
  {
    title: "Run audit checks",
    description: "Detect denials, duplicate lines, responsibility mismatches, and network issues.",
  },
  {
    title: "Generate disputes",
    description: "Create provider and insurance communication assets from the audit output.",
  },
]

export default async function Home() {
  const session = await auth0.getSession()
  const user = session?.user

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm sm:p-10">
        <p className="mb-4 inline-flex rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Audit + Communication Agent
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Catch medical billing issues and ship dispute-ready communication in minutes.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          MedBill Agent compares provider bills against insurance EOBs, identifies costly discrepancies, and prepares
          professional follow-up actions for providers and payers.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {user ? (
            <a
              href="/dashboard"
              className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open dashboard
            </a>
          ) : (
            <a
              href="/auth/login?returnTo=/dashboard"
              className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Log in to continue
            </a>
          )}
          <span className="text-sm text-slate-500">No middleware, minimal App Router flow.</span>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((step, idx) => (
          <article key={step.title} className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {idx + 1}</p>
            <h2 className="mt-2 text-base font-semibold text-slate-900">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
