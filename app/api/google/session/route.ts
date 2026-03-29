import { NextResponse } from "next/server"
import { readGoogleOAuthSession } from "@/lib/google-oauth"
import { TARGET_GMAIL_SENDER } from "@/lib/email"

export async function GET() {
  const session = await readGoogleOAuthSession()
  if (!session?.accessToken) {
    return NextResponse.json({ connected: false })
  }

  try {
    const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    })

    if (!profileRes.ok) {
      return NextResponse.json({ connected: false, error: `Failed profile check (${profileRes.status})` })
    }

    const profile = (await profileRes.json()) as { emailAddress?: string }
    const email = profile.emailAddress ?? null

    return NextResponse.json({
      connected: true,
      email,
      allowedSender: TARGET_GMAIL_SENDER,
      isExpectedSender: email?.toLowerCase() === TARGET_GMAIL_SENDER,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Session check failed"
    return NextResponse.json({ connected: false, error: message }, { status: 500 })
  }
}
