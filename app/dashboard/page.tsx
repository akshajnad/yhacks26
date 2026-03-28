/* eslint-disable @next/next/no-html-link-for-pages */
import { auth0 } from "@/lib/auth0"

function profileValue(value?: string | null) {
  if (!value) return "Not provided"
  return value
}

export default async function DashboardPage() {
  const session = await auth0.getSession()
  const user = session?.user

  if (!user) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-xl border border-[var(--border)] bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            You are not signed in. Use Auth0 login to view your profile dashboard.
          </p>
          <a
            href="/auth/login?returnTo=/dashboard"
            className="mt-6 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Login with Auth0
          </a>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {user.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture}
              alt={user.name ?? user.email ?? "User"}
              className="h-16 w-16 rounded-full border border-[var(--border)] object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full border border-[var(--border)] bg-slate-100" />
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{profileValue(user.name)}</h1>
            <p className="text-sm text-slate-600">{profileValue(user.email)}</p>
          </div>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nickname</dt>
            <dd className="mt-2 text-sm font-medium text-slate-900">{profileValue(user.nickname)}</dd>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email verified</dt>
            <dd className="mt-2 text-sm font-medium text-slate-900">{user.email_verified ? "Yes" : "No"}</dd>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Auth0 subject</dt>
            <dd className="mt-2 text-sm font-mono text-slate-900">{profileValue(user.sub)}</dd>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last profile update</dt>
            <dd className="mt-2 text-sm font-medium text-slate-900">{profileValue(user.updated_at)}</dd>
          </div>
        </dl>

        <div className="mt-8 border-t border-[var(--border)] pt-6">
          <a
            href="/auth/logout?returnTo=/"
            className="inline-flex rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Logout
          </a>
        </div>
      </div>
    </section>
  )
}
