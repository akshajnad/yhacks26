"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth0 } from "@auth0/auth0-react"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/", label: "Home" },
  { href: "/analysis/new", label: "Start claim" },
  { href: "/dashboard", label: "Cases" },
  { href: "/legal", label: "Research" },
]

function getDisplayName(name?: string | null, email?: string | null) {
  return name ?? email ?? "User"
}

export function AppHeader() {
  const pathname = usePathname()
  const { user, loginWithRedirect, logout, isLoading } = useAuth0()
  const displayName = getDisplayName(user?.name, user?.email)

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--color-stone-50)_88%,var(--color-white)_12%)]/95 backdrop-blur">
      <div className="page-shell flex min-h-[4.75rem] items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="group">
            <div className="font-[family:var(--font-display)] text-[1.6rem] leading-none tracking-[-0.03em] text-[var(--color-ink-900)]">
              Redline
            </div>
            <div className="mt-1 text-[0.78rem] tracking-[0.12em] text-[var(--color-ink-500)] uppercase">
              Claims workspace
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm transition-colors",
                    active
                      ? "bg-[var(--color-stone-100)] text-[var(--color-ink-900)]"
                      : "text-[var(--color-ink-700)] hover:bg-[var(--color-stone-100)] hover:text-[var(--color-ink-900)]"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!isLoading && user ? (
            <>
              <div className="hidden rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--color-white)_65%,var(--color-stone-100)_35%)] px-4 py-2 md:block">
                <div className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--color-ink-500)]">Signed in</div>
                <div className="max-w-[12rem] truncate text-sm font-semibold text-[var(--color-ink-900)]" title={displayName}>
                  {displayName}
                </div>
              </div>
              <button
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="inline-flex h-[44px] items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--color-white)_74%,var(--color-stone-100)_26%)] px-4 text-sm font-semibold text-[var(--color-ink-900)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--color-stone-100)]"
              >
                Log out
              </button>
            </>
          ) : !isLoading ? (
            <>
              <Link
                href="/#process"
                className="hidden rounded-full px-4 py-2 text-sm text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-stone-100)] hover:text-[var(--color-ink-900)] md:inline-flex"
              >
                See how it works
              </Link>
              <button
                onClick={() => loginWithRedirect()}
                className="inline-flex h-[48px] items-center justify-center rounded-full bg-[var(--color-teal-500)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--color-teal-600)] active:bg-[var(--color-teal-700)]"
              >
                Start your claim
              </button>
            </>
          ) : (
            <div className="h-12 w-32 animate-pulse rounded-full bg-[var(--color-stone-100)]" />
          )}
        </div>
      </div>
    </header>
  )
}
