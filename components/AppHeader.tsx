"use client";
import Link from "next/link";
import { useAuth0 } from "@auth0/auth0-react";

function getDisplayName(name?: string | null, email?: string | null) {
  return name ?? email ?? "User";
}

export function AppHeader() {
  const { user, loginWithRedirect, logout, isLoading } = useAuth0();
  const displayName = getDisplayName(user?.name, user?.email);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/95">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900"
        >
          <span>Redline</span>
          <span className="hidden text-xs font-medium text-slate-500 sm:inline">
            Medical Billing Audit
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {!isLoading && user ? (
            <>
              <Link
                href="/analysis/new"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                New Analysis
              </Link>

              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Dashboard
              </Link>
              <div className="hidden items-center gap-2 rounded-md border border-[var(--border)] bg-slate-50 px-2.5 py-1 sm:flex">
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt={displayName}
                    className="h-6 w-6 rounded-full border border-[var(--border)] object-cover"
                  />
                ) : null}
                <span
                  className="max-w-36 truncate text-xs font-medium text-slate-700"
                  title={displayName}
                >
                  {displayName}
                </span>
              </div>
              <button
                onClick={() =>
                  logout({ logoutParams: { returnTo: window.location.origin } })
                }
                className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Logout
              </button>
            </>
          ) : !isLoading ? (
            <button
              onClick={() => loginWithRedirect()}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Login
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
