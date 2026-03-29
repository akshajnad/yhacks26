import { cookies } from "next/headers"

export const GMAIL_SESSION_COOKIE = "NIPS.gmail.session"

export interface GoogleOAuthSession {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  email?: string
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000"
  const redirectUri = `${appOrigin.replace(/\/$/, "")}/api/google/oauth/callback`

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET")
  }

  return { clientId, clientSecret, redirectUri }
}

export async function readGoogleOAuthSession(): Promise<GoogleOAuthSession | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(GMAIL_SESSION_COOKIE)?.value
  if (!raw) return null

  try {
    const json = Buffer.from(raw, "base64url").toString("utf-8")
    const parsed = JSON.parse(json) as GoogleOAuthSession
    if (!parsed.accessToken || !parsed.expiresAt) return null
    return parsed
  } catch {
    return null
  }
}

export async function writeGoogleOAuthSession(session: GoogleOAuthSession): Promise<void> {
  const cookieStore = await cookies()
  const encoded = Buffer.from(JSON.stringify(session), "utf-8").toString("base64url")

  cookieStore.set(GMAIL_SESSION_COOKIE, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  })
}
