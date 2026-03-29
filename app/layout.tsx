import type { Metadata } from "next"
import { Manrope, Newsreader } from "next/font/google"
import { AppHeader } from "@/components/AppHeader"
import { Auth0ProviderWrapper } from "@/components/Auth0ProviderWrapper"
import "./globals.css"

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
})

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-ui",
})

export const metadata: Metadata = {
  title: "Redline Claims",
  description: "A calm medical claims workspace that helps people review charges, identify issues, and prepare stronger disputes.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Auth0ProviderWrapper>
          <AppHeader />

          <main className="flex-1">{children}</main>

          <footer className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--color-stone-50)_72%,var(--color-stone-100)_28%)] py-6">
            <div className="page-shell flex flex-col gap-2 text-sm text-[var(--color-ink-500)] md:flex-row md:items-center md:justify-between">
              <p className="font-[family:var(--font-display)] text-[1.1rem] text-[var(--color-ink-700)]">
                Redline Claims
              </p>
              <p>Clear billing review, plain-language evidence, and calm next steps.</p>
            </div>
          </footer>
        </Auth0ProviderWrapper>
      </body>
    </html>
  )
}
