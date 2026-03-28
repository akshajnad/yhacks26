"use client"
import Link from "next/link"
import { useAuth0 } from "@auth0/auth0-react"

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

export default function Home() {
  const { user, loginWithRedirect, isLoading } = useAuth0()

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-[var(--border)] bg-white p-8 sm:p-10">
        <p className="mb-4 inline-flex rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Redline
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.1rem]">
          Audit medical bills against EOBs in one clear workflow.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Redline surfaces billing mismatches, denial risk, and patient responsibility errors so teams can act faster.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {!isLoading && user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Open workspace
            </Link>
          ) : !isLoading ? (
            <button
              onClick={() => loginWithRedirect()}
              className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Log in to get started
            </button>
          ) : (
            <div className="h-10 w-36 animate-pulse rounded-md bg-slate-100" />
          )}
          <span className="text-sm text-slate-500">Built for healthcare billing and appeals workflows.</span>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((step, idx) => (
          <article key={step.title} className="rounded-lg border border-[var(--border)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {idx + 1}</p>
            <h2 className="mt-2 text-base font-semibold text-slate-900">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-[var(--border)] bg-slate-50 px-5 py-4">
        <p className="text-sm text-slate-700">
          Uses secure Auth0 sign-in and keeps the workflow focused: detect issue, explain impact, take action.
        </p>
      </div>

      <div className="mt-8 flex justify-start">
        {!isLoading && user ? (
          <Link
            href="/dashboard"
            className="rounded-md border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Continue to dashboard
          </Link>
        ) : !isLoading ? (
          <button
            onClick={() => loginWithRedirect()}
            className="rounded-md border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign in with Auth0
          </button>
        ) : null}
      </div>
    </section>
  )
}
