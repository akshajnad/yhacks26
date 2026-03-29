import { chat } from "@/lib/ai/transport"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json()

    const systemMessage = {
      role: "system",
      content: `You are Redline AI, a medical billing expert assistant. 
You are helping the user understand their medical bill and insurance EOB.

CONTEXT:
${context}

Tone: Professional, helpful, concise. 
If they ask about legal protections, refer to the laws in the context.
If they ask about specific costs, use the extracted fields.`,
    }

    const response = await chat([systemMessage, ...messages])
    return NextResponse.json({ content: response })
  } catch (err) {
    console.error("[chat] error:", err)
    return NextResponse.json({ error: "Failed to chat" }, { status: 500 })
  }
}
