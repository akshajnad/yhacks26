import { NextRequest, NextResponse } from "next/server"
import { getGoogleOAuthConfig, writeGoogleOAuthSession } from "@/lib/google-oauth"

const OAUTH_STATE_COOKIE = "redline.google.oauth.state"

interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  const state = req.nextUrl.searchParams.get("state")
  const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value

  const appOrigin = (process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "")
  const redirectTarget = new URL("/action/email?oauth=connected", appOrigin)

  if (!code || !state || !stateCookie || state !== stateCookie) {
    redirectTarget.searchParams.set("oauth", "error")
    redirectTarget.searchParams.set("message", "OAuth state validation failed")
    return NextResponse.redirect(redirectTarget)
  }

  try {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig()

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed (${tokenRes.status})`)
    }

    const tokenData = (await tokenRes.json()) as TokenResponse

    await writeGoogleOAuthSession({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
    })

    const response = NextResponse.redirect(redirectTarget)
    response.cookies.delete(OAUTH_STATE_COOKIE)
    return response
  } catch (error) {
    redirectTarget.searchParams.set("oauth", "error")
    redirectTarget.searchParams.set("message", error instanceof Error ? error.message : "OAuth callback failed")
    return NextResponse.redirect(redirectTarget)
  }
}
