import { analyze } from "@/lib/ai/transport"
import type { AnalysisResult } from "@/types/analysis"

interface GuidanceJson {
  nextStepsGuidance: string
  patientImpactSummary: string
  escalationNotes: string
}

/**
 * Uses the same Lava → OpenAI JSON path as the rest of the app (not the chatbot K2 route).
 */
export async function generateCallFollowUpGuidance(input: {
  transcriptSummary: string
  callSummaryTitle?: string | null
  analysis: AnalysisResult
}): Promise<GuidanceJson> {
  const { transcriptSummary, callSummaryTitle, analysis } = input
  const ef = analysis.extractedFields
  const issues = (analysis.detectedIssues ?? [])
    .map((i) => `${i.type}: ${i.description}`)
    .join("; ")

  const userContent = `You are helping a patient advocate plan next steps after a phone call with a provider or payer.

ELEVENLABS CALL SUMMARY TITLE: ${callSummaryTitle ?? "n/a"}

ELEVENLABS TRANSCRIPT / CALL SUMMARY (from the actual conversation):
${transcriptSummary}

CASE CONTEXT (from our audit):
- Provider: ${ef.provider ?? "unknown"}
- Insurer: ${ef.insurer ?? "unknown"}
- Claim / member: ${ef.claimNumber ?? "n/a"} / ${ef.memberID ?? "n/a"}
- Patient responsibility (if known): ${ef.patientResponsibility ?? "n/a"}
- Denial reason (if any): ${ef.denialReason ?? "n/a"}
- Detected issues: ${issues || "none listed"}

Respond with a single JSON object only (no markdown fences) with exactly these string keys:
- "nextStepsGuidance": Plain-text, not Markdown. Keep it as short as possible while not losing any information. Concrete follow-ups: second call, written dispute, appeal, escalation to supervisor, state DOI, No Surprises Act, documentation to request, timelines. If the summary suggests the dispute was rejected or stalled, say escalation is likely (another call with firmer script, certified mail, etc.). If there is no indication of the user responding to the AI assistant's intro message, then the generated text should mention that the user did not respond to the AI assistant's intro message and presumably hung up early, might need to be escalated to a human.
- "patientImpactSummary": Plain language on what repeated wrongful denials or balance billing could mean for the patient financially. Mention that treble damages, penalties, and specific remedies vary by state and fact pattern — this is educational, not legal advice. Make sure you also mention any sort of benefits the user might be able to receive because of the error that was found on their bill and as a result of the legal dispute, mentioned earlier in the guidance.
- "escalationNotes": When legal review or formal complaints (e.g. AG, CMS, state insurance) might be appropriate; stay general, but do not lose any information and mention any sort of benefits the user might be able to receive because of the error that was found on their bill and as a result of the legal dispute, mentioned earlier in the guidance.

Keep a professional tone. Do not invent facts not supported by the transcript summary.`

  const raw = await analyze(
    [
      {
        role: "system",
        content:
          "You output only valid JSON with keys nextStepsGuidance, patientImpactSummary, escalationNotes. All values are strings. No other keys.",
      },
      { role: "user", content: userContent },
    ],
    0.2
  )

  let parsed: GuidanceJson
  try {
    parsed = JSON.parse(raw) as GuidanceJson
  } catch {
    return {
      nextStepsGuidance: raw.slice(0, 8000),
      patientImpactSummary: "",
      escalationNotes: "",
    }
  }

  return {
    nextStepsGuidance: String(parsed.nextStepsGuidance ?? ""),
    patientImpactSummary: String(parsed.patientImpactSummary ?? ""),
    escalationNotes: String(parsed.escalationNotes ?? ""),
  }
}
