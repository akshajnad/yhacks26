import type { Metadata } from "next"
import { AppHeader } from "@/components/AppHeader"
import { Auth0ProviderWrapper } from "@/components/Auth0ProviderWrapper"
import "./globals.css"

export const metadata: Metadata = {
  title: "Redline",
  description: "Healthcare billing audit workspace for bill/EOB review and dispute readiness.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Auth0ProviderWrapper>
          <AppHeader />

          <main className="flex-1">{children}</main>
        </Auth0ProviderWrapper>
      </body>
    </html>
  )
}
