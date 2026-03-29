"use client"

import { useAuth0 } from "@auth0/auth0-react"
import { appOrigin } from "@/lib/auth0-public"

export function AuthNav() {
  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect,
    logout: auth0Logout,
    user,
  } = useAuth0()

  const signup = () =>
    loginWithRedirect({ authorizationParams: { screen_hint: "signup" } })

  const logout = () =>
    auth0Logout({ logoutParams: { returnTo: appOrigin } })

  if (isLoading) {
    return <span className="text-sm text-[var(--muted-foreground)]">Signing in…</span>
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <span className="max-w-[12rem] truncate text-sm text-[var(--muted-foreground)]" title={user.email ?? undefined}>
          {user.email ?? user.name ?? "Signed in"}
        </span>
        <button
          type="button"
          onClick={logout}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/30"
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error ? (
        <span className="text-xs text-red-600" title={error.message}>
          Auth error
        </span>
      ) : null}
      <button
        type="button"
        onClick={signup}
        className="rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Sign up
      </button>
      <button
        type="button"
        onClick={() => loginWithRedirect()}
        className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]/30"
      >
        Log in
      </button>
    </div>
  )
}
