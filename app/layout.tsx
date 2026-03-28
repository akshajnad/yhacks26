import type { Metadata } from "next"
import { Auth0ProviderWrapper } from "@/components/Auth0ProviderWrapper"
import { AuthNav } from "@/components/AuthNav"
import "./globals.css"

export const metadata: Metadata = {
  title: "MedBill Analyzer",
  description: "AI-powered medical bill and EOB analysis — spot overcharges, denials, and No Surprises Act violations instantly.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Auth0ProviderWrapper>
          {/* Nav — Auth0 runs only on the client inside this wrapper */}
          <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-lg font-semibold tracking-tight">MedBill Analyzer</span>
                <span className="hidden shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 sm:inline">
                  Module 1
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <nav className="hidden items-center gap-4 sm:flex">
                  <span
                    className="cursor-not-allowed text-sm text-[var(--muted-foreground)] opacity-50"
                    title="Coming in module 2"
                  >
                    Dashboard
                  </span>
                  <span
                    className="cursor-not-allowed text-sm text-[var(--muted-foreground)] opacity-50"
                    title="Coming in module 2"
                  >
                    My Cases
                  </span>
                </nav>
                <AuthNav />
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--muted-foreground)]">
            MedBill Agent &mdash; Module 1: Document Analysis &bull; Actions, Dashboard, Appeals coming soon
          </footer>
        </Auth0ProviderWrapper>
      </body>
    </html>
  )
}
