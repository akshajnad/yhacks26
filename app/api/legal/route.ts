/**
 * POST /api/legal
 *
 * Body: { city: string; state: string; issue: string; lineItems?: LineItem[] }
 *
 * Calls GPT-5.4 directly, streams the response, and strips any
 * <think> / reasoning blocks before forwarding tokens to the client.
 *
 * SSE format:   data: <token>\n\n
 * Terminated:   data: [DONE]\n\n
 */

import { NextRequest } from "next/server";
import { buildLegalPrompts } from "@/lib/agents/legal";

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

    // ── Call GPT-5.4 with streaming ──────────────────────────────────────────
    let upstream: Response;
    try {
        upstream = await fetch(
            "https://api.lava.so/v1/forward?u=https%3A%2F%2Fapi.openai.com%2Fv1%2Fchat%2Fcompletions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.LAVA_FORWARD_TOKEN}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-search-preview",
                    stream: true,
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt,
                        },
                        {
                            role: "user",
                            content: userMessage,
                        },
                    ],
                }),
            }
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error reaching OpenAI";
        return new Response(JSON.stringify({ error: msg }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => "");
        return new Response(
            JSON.stringify({ error: `OpenAI API error (${upstream.status}): ${text}` }),
            { status: 502, headers: { "Content-Type": "application/json" } }
        );
    }

    // ── Stream tokens → browser, stripping any thinking blocks ──────────────
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (text: string) => {
                const escaped = text.replace(/\n/g, "\\n");
                controller.enqueue(encoder.encode(`data: ${escaped}\n\n`));
            };

            const reader = upstream.body!.getReader();
            let sseBuffer = "";

            // Thinking-strip state machine
            // We accumulate a small "lookahead" buffer to detect opening tags
            // that may span multiple SSE chunks, then suppress until close tag.
            let thinkBuffer = ""; // holds suppressed content inside a think block
            let inThink = false;  // are we currently inside a <think> block?

            const OPEN_TAGS = ["<think>", "<thinking>"];
            const CLOSE_TAGS = ["</think>", "</thinking>"];

            // Also strip the preamble "(User is saying...)" pattern that GPT sometimes emits.
            // We track a rolling window of output chars to detect and cut it.
            let outputSoFar = "";
            let preambleStripped = false;

            function processToken(token: string): void {
                if (inThink) {
                    thinkBuffer += token;
                    for (const ct of CLOSE_TAGS) {
                        const idx = thinkBuffer.indexOf(ct);
                        if (idx !== -1) {
                            inThink = false;
                            // Emit anything after the close tag
                            const after = thinkBuffer.slice(idx + ct.length);
                            thinkBuffer = "";
                            if (after) processToken(after);
                            return;
                        }
                    }
                    // Still inside think block — keep buffering, emit nothing
                    return;
                }

                // Peek for opening tags
                for (const ot of OPEN_TAGS) {
                    const idx = token.indexOf(ot);
                    if (idx !== -1) {
                        // Emit anything before the tag
                        const before = token.slice(0, idx);
                        if (before) send(before);
                        inThink = true;
                        thinkBuffer = "";
                        // Process remainder after the opening tag recursively
                        const remainder = token.slice(idx + ot.length);
                        if (remainder) processToken(remainder);
                        return;
                    }
                }

                // Strip common preamble patterns like "(User is saying...)", "(Expecting...)"
                // by detecting parenthesized meta-commentary at the very start of output.
                if (!preambleStripped) {
                    outputSoFar += token;
                    // Check for preamble markers like "(User is saying...)" or "(Expecting...)"
                    // These typically happen at the very beginning within parentheses.
                    if (outputSoFar.length > 5) {
                        // Look for a completed parenthetical block at the start
                        const parenMatch = outputSoFar.match(/^\s*\([^)]+\)\s*/);
                        if (parenMatch) {
                            // If we find one, we strip it and anything before it.
                            // We don't mark preambleStripped=true yet, because there could be another one.
                            outputSoFar = outputSoFar.slice(parenMatch[0].length);
                            return;
                        }

                        // If it starts with a numbered item, we are past the preamble.
                        if (/^\s*[1]\./.test(outputSoFar)) {
                            preambleStripped = true;
                            send(outputSoFar);
                            outputSoFar = "";
                            return;
                        }

                        // Safety: if we get too much text without finding a numbered item or paren, just flush it.
                        if (outputSoFar.length > 500) {
                            preambleStripped = true;
                            send(outputSoFar);
                            outputSoFar = "";
                        }
                    }
                    return;
                }

                send(token);
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                sseBuffer += decoder.decode(value, { stream: true });
                const lines = sseBuffer.split("\n");
                sseBuffer = lines.pop() ?? "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith("data:")) continue;

                    const jsonStr = trimmed.slice(5).trim();
                    if (jsonStr === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(jsonStr);
                        const delta: string | undefined = parsed.choices?.[0]?.delta?.content;
                        if (delta) processToken(delta);
                    } catch {
                        // skip malformed chunks
                    }
                }
            }

            // Flush remaining SSE buffer
            if (sseBuffer.trim()) {
                const trimmed = sseBuffer.trim();
                if (trimmed.startsWith("data:")) {
                    const jsonStr = trimmed.slice(5).trim();
                    if (jsonStr !== "[DONE]") {
                        try {
                            const parsed = JSON.parse(jsonStr);
                            const delta: string | undefined = parsed.choices?.[0]?.delta?.content;
                            if (delta) processToken(delta);
                        } catch { /* ignore */ }
                    }
                }
            }

            // Flush any remaining preamble buffer (edge case: very short response)
            if (outputSoFar) send(outputSoFar);

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
