import { NextRequest, NextResponse } from "next/server"
import { buildRfc2822Message, TARGET_GMAIL_SENDER, toBase64Url } from "@/lib/email"
import { readGoogleOAuthSession } from "@/lib/google-oauth"

interface SendBody {
  mode: "draft" | "send"
  to: string
  subject: string
  body: string
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as SendBody
    const { mode, to, subject, body } = payload

    if ((mode !== "draft" && mode !== "send") || !to || !subject || !body) {
      return NextResponse.json({ error: "mode, to, subject, and body are required" }, { status: 400 })
    }

    const session = await readGoogleOAuthSession()
    if (!session?.accessToken) {
      return NextResponse.json({ error: "No Gmail OAuth session found. Connect Google first." }, { status: 401 })
    }

    const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    })

    if (!profileRes.ok) {
      return NextResponse.json({ error: `Unable to Veritasfy Gmail account (${profileRes.status})` }, { status: 401 })
    }

    const profile = (await profileRes.json()) as { emailAddress?: string }
    const authenticatedEmail = profile.emailAddress?.toLowerCase()

    if (authenticatedEmail !== TARGET_GMAIL_SENDER) {
      return NextResponse.json(
        {
          error: `Connected Gmail account is ${profile.emailAddress ?? "unknown"}. Please connect ${TARGET_GMAIL_SENDER}.`,
        },
        { status: 403 }
      )
    }

    const rawMessage = buildRfc2822Message({ to, subject, body })
    const encoded = toBase64Url(rawMessage)

    const endpoint =
      mode === "draft"
        ? "https://gmail.googleapis.com/gmail/v1/users/me/drafts"
        : "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

    const requestBody = mode === "draft" ? { message: { raw: encoded } } : { raw: encoded }

    const gmailRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!gmailRes.ok) {
      const errorText = await gmailRes.text()
      return NextResponse.json({ error: `Gmail API error (${gmailRes.status}): ${errorText}` }, { status: 502 })
    }

    const data = (await gmailRes.json()) as { id?: string; message?: { id?: string } }

    return NextResponse.json({
      success: true,
      mode,
      id: data.id ?? data.message?.id ?? null,
      authenticatedEmail,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail send failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
