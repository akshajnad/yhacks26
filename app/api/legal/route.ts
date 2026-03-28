/**
 * POST /api/legal
 *
 * Body: { city: string; state: string; issue: string; lineItems?: LineItem[] }
 *
 * Streams Perplexity sonar-deep-research tokens directly to the client so the
 * connection stays alive during the full 30–90 s research window.
 *
 * The response is a text/event-stream (SSE).  Each line is:
 *   data: <token text>\n\n
 * Terminated with:
 *   data: [DONE]\n\n
 */

import { NextRequest } from "next/server";
import { buildLegalPrompts } from "@/lib/agents/legal";

// Allow up to 5 minutes for deep research
export const maxDuration = 300;

export async function POST(req: NextRequest) {
    let city: string, state: string, issue: string, lineItems: unknown[];

    try {
        const body = await req.json();
        city = body.city;
        state = body.state;
        issue = body.issue;
        lineItems = body.lineItems ?? [];
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (!city?.trim() || !state?.trim() || !issue?.trim()) {
        return new Response(JSON.stringify({ error: "city, state, and issue are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const { systemPrompt, userMessage } = buildLegalPrompts({
        city: city.trim(),
        state: state.trim(),
        issue: issue.trim(),
        lineItems: lineItems as { code: string; description: string; amount: string }[],
    });

    // ── Open a streaming call to Perplexity ──────────────────────────────────
    let upstream: Response;
    try {
        upstream = await fetch(
            "https://api.lava.so/v1/forward?u=https%3A%2F%2Fapi.perplexity.ai%2Fchat%2Fcompletions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.LAVA_FORWARD_TOKEN}`,
                },
                body: JSON.stringify({
                    model: "sonar-deep-research",
                    stream: true,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userMessage },
                    ],
                    search_domain_filter: [
                        "law.cornell.edu",
                        "cms.gov",
                        "dol.gov",
                        "hhs.gov",
                        `${state.trim().toLowerCase().replace(/\s+/g, "")}.gov`,
                    ],
                    return_citations: true,
                }),
            }
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error reaching API";
        return new Response(JSON.stringify({ error: msg }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => "");
        return new Response(
            JSON.stringify({ error: `Upstream API error (${upstream.status}): ${text}` }),
            { status: 502, headers: { "Content-Type": "application/json" } }
        );
    }

    // ── Pipe SSE tokens from Perplexity → browser ────────────────────────────
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
        async start(controller) {
            const reader = upstream.body!.getReader();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? ""; // keep incomplete line in buffer

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith("data:")) continue;

                    const jsonStr = trimmed.slice(5).trim();
                    if (jsonStr === "[DONE]") {
                        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(jsonStr);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            // Escape newlines inside the SSE data field
                            const escaped = delta.replace(/\n/g, "\\n");
                            controller.enqueue(encoder.encode(`data: ${escaped}\n\n`));
                        }
                    } catch {
                        // skip malformed chunks
                    }
                }
            }

            // Flush remaining buffer
            if (buffer.trim()) {
                const trimmed = buffer.trim();
                if (trimmed.startsWith("data:")) {
                    const jsonStr = trimmed.slice(5).trim();
                    if (jsonStr !== "[DONE]") {
                        try {
                            const parsed = JSON.parse(jsonStr);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            if (delta) {
                                controller.enqueue(encoder.encode(`data: ${delta.replace(/\n/g, "\\n")}\n\n`));
                            }
                        } catch { /* ignore */ }
                    }
                }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
        },
        cancel() {
            upstream.body?.cancel().catch(() => { });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
