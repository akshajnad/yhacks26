/* eslint-disable @next/next/no-html-link-for-pages */
import Link from "next/link"
import { auth0 } from "@/lib/auth0"

function getDisplayName(name?: string | null, email?: string | null) {
  return name ?? email ?? "User"
}

export async function AppHeader() {
  const session = await auth0.getSession()
  const user = session?.user
  const displayName = getDisplayName(user?.name, user?.email)

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-base font-semibold tracking-tight text-slate-900">
          MedBill Agent
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Dashboard
              </Link>
              <div className="hidden items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 sm:flex">
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt={displayName}
                    className="h-7 w-7 rounded-full border border-[var(--border)] object-cover"
                  />
                ) : null}
                <span className="max-w-36 truncate text-sm font-medium text-slate-700" title={displayName}>
                  {displayName}
                </span>
              </div>
              <a
                href="/auth/logout?returnTo=/"
                className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Logout
              </a>
            </>
          ) : (
            <a
              href="/auth/login?returnTo=/dashboard"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Login
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}
