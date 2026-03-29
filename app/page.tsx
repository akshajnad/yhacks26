"use client"
import Link from "next/link"
import Image from "next/image"
import { useAuth0 } from "@auth0/auth0-react"

const steps = [
  {
    title: "Upload bill and EOB",
    description: "Bring both documents into one workspace in a minute.",
  },
  {
    title: "Review flagged issues",
    description: "See mismatches, denials, and responsibility gaps in plain language.",
  },
  {
    title: "Take the next step",
    description: "Move directly into dispute drafts or follow-up actions.",
  },
]

export default function Home() {
  const { user, loginWithRedirect, isLoading } = useAuth0()

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
          <div>
            <p className="mb-4 inline-flex rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Redline
            </p>
            <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Review medical bills and EOBs in one clear workflow.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Upload a medical bill and EOB, review flagged issues, and move cleanly into dispute or follow-up actions.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {!isLoading && user ? (
                <Link
                  href="/dashboard"
                  className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Open workspace
                </Link>
              ) : !isLoading ? (
                <button
                  onClick={() => loginWithRedirect()}
                  className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Log in to get started
                </button>
              ) : (
                <div className="h-10 w-36 animate-pulse rounded-md bg-slate-100" />
              )}
              <Link
                href="#workflow"
                className="rounded-md border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)] sm:p-4">
            <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
              Billing audit workspace preview
            </div>
            <Image
              src="/redline-dashboard.png"
              alt="Redline billing audit workspace preview"
              width={1400}
              height={900}
              priority
              className="h-auto w-full rounded-xl border border-slate-200"
            />
          </div>
        </div>
      </div>

      <div id="workflow" className="mt-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-sm font-medium text-slate-900">How it works</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {steps.map((step, idx) => (
            <article key={step.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {idx + 1}</p>
              <h2 className="mt-2 text-sm font-semibold text-slate-900">{step.title}</h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
        <p className="mt-5 text-sm text-slate-600">
          Secure Auth0 sign-in, practical issue detection, and a clear path from review to follow-up.
        </p>
      </div>
    </section>
  )
}
