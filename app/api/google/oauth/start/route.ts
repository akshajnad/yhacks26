import { NextResponse } from "next/server"
import { getGoogleOAuthConfig } from "@/lib/google-oauth"

const OAUTH_STATE_COOKIE = "redline.google.oauth.state"

export async function GET() {
  try {
    const { clientId, redirectUri } = getGoogleOAuthConfig()
    const state = crypto.randomUUID()

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    url.searchParams.set("client_id", clientId)
    url.searchParams.set("redirect_uri", redirectUri)
    url.searchParams.set("response_type", "code")
    url.searchParams.set("scope", ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.compose"].join(" "))
    url.searchParams.set("access_type", "offline")
    url.searchParams.set("prompt", "consent")
    url.searchParams.set("state", state)

    const response = NextResponse.redirect(url)
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth setup failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
