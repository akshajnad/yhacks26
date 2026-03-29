"use client";
//Hello
import Link from "next/link";
import { useAuth0 } from "@auth0/auth0-react";

function getDisplayName(name?: string | null, email?: string | null) {
  return name ?? email ?? "User";
}

export function AppHeader() {
  const { user, loginWithRedirect, logout, isLoading } = useAuth0();
  const displayName = getDisplayName(user?.name, user?.email);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-[30px] font-semibold tracking-[-0.02em] text-slate-900 transition-opacity hover:opacity-75"
        >
          <span>Veritas</span>
          <span className="hidden text-xs font-medium text-slate-500 sm:inline">
            Medical Billing Audit
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          {!isLoading && user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Dashboard
              </Link>

              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 sm:flex">
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt={displayName}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className="max-w-32 truncate text-sm font-medium text-slate-700"
                  title={displayName}
                >
                  {displayName}
                </span>
              </div>

              <button
                onClick={() =>
                  logout({ logoutParams: { returnTo: window.location.origin } })
                }
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Log out
              </button>
            </>
          ) : !isLoading ? (
            <button
              onClick={() => loginWithRedirect()}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Log in
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}