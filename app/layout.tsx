import type { Metadata } from "next"
import { AppHeader } from "@/components/AppHeader"
import { Auth0ProviderWrapper } from "@/components/Auth0ProviderWrapper"
import "./globals.css"

export const metadata: Metadata = {
  title: "MedBill Agent",
  description: "Audit medical bills and EOBs, then generate clean dispute workflows.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Auth0ProviderWrapper>
          <AppHeader />

          <main className="flex-1">{children}</main>

          <footer className="border-t border-[var(--border)] bg-white py-4 text-center text-xs text-slate-500">
            MedBill Agent demo
          </footer>
        </Auth0ProviderWrapper>
      </body>
    </html>
  )
}
