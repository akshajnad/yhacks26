/**
 * Builds a concise outbound phone script from the legal research report
 * for use with ElevenLabs Conversational AI (dynamic variables / agent context).
 */

export interface LegalCallScriptMeta {
  city: string;
  state: string;
  issue: string;
}

/** Strip markdown headings/bullets for spoken clarity */
function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, " ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.+?)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Short professional script the agent can use as first message / context.
 * Keeps under typical IVR attention span; full report passed separately as excerpt.
 */
export function buildOutboundCallScriptFromReport(
  report: string,
  meta: LegalCallScriptMeta,
): { script: string; excerpt: string } {
  const excerptRaw = report.slice(0, 4500);
  const excerpt = stripMarkdownForSpeech(excerptRaw);

  const issueShort = meta.issue.length > 220 ? `${meta.issue.slice(0, 217)}…` : meta.issue;

  const script = [
    `Good day — I'm calling with authorization from the patient regarding a medical billing matter in ${meta.city}, ${meta.state}.`,
    `The issue in brief: ${issueShort}`,
    "We have an AI-assisted legal research summary citing applicable federal and state protections that may apply.",
    "We're requesting a review of the account, written confirmation of any corrections, and clear next steps.",
    "Please let me know the best way to document this inquiry and whether additional information is needed from our side.",
  ].join(" ");

  return { script, excerpt };
}

/**
 * Actionable next steps for the patient (spoken / agent context).
 * Combines keyword-aware hints from the report with general billing-dispute hygiene.
 */
export function buildNextStepsRecommendations(report: string, meta: LegalCallScriptMeta): string {
  const r = report.toLowerCase();
  const steps: string[] = [];

  steps.push(
    `Request a written, itemized statement and the most recent explanation of benefits for services in ${meta.city}, ${meta.state}.`,
  );

  if (/surprise|no surprises|balance bill|out.of.network|out-of-network/i.test(r)) {
    steps.push(
      "Ask whether the No Surprises Act or your state's surprise-billing law applies, and request an IDR or state process if relevant.",
    );
  }
  if (/deni|denial|appeal|grievance/i.test(r)) {
    steps.push(
      "Confirm the insurer's appeal or grievance deadline, required forms, and where to send medical records.",
    );
  }
  if (/eob|explanation of benefit|copay|deduct|coinsurance/i.test(r)) {
    steps.push(
      "Line up each bill line item with the EOB: look for duplicate charges, wrong coding, or incorrect patient responsibility.",
    );
  }
  if (/emergency|er\b|emtala/i.test(r)) {
    steps.push(
      "If this was emergency care, ask how network status and EMTALA-related protections were applied to the claim.",
    );
  }

  steps.push(
    "Log every contact: representative name, call reference number, date, and what was promised in follow-up.",
  );
  steps.push(
    "This research is informational only — for large balances or legal deadlines, consult a licensed attorney or your state insurance consumer help line.",
  );

  return steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

export interface ConvaiLegalPayload {
  /** Opening line + context for the ConvAI agent (`conversation_config_override.agent.first_message`) */
  firstMessage: string;
  /** String-only dynamic variables for agent templates ({{variable_name}} in ElevenLabs) */
  dynamicVariables: Record<string, string>;
  /** Short labels for API responses / UI */
  nextSteps: string;
  issueSummary: string;
  legalExcerpt: string;
}

/**
 * Full payload content for ElevenLabs outbound call: first message + dynamic variables.
 * `first_message` is what the agent should lead with; variables mirror the same data for custom prompts.
 */
export function buildConvaiLegalConversation(
  report: string,
  meta: LegalCallScriptMeta,
  options?: { maxFirstMessageChars?: number },
): ConvaiLegalPayload {
  const maxChars = options?.maxFirstMessageChars ?? 3500;
  const { script, excerpt } = buildOutboundCallScriptFromReport(report, meta);
  const nextSteps = buildNextStepsRecommendations(report, meta);
  const issueSummary =
    meta.issue.length > 400 ? `${meta.issue.slice(0, 397)}…` : meta.issue;
  const legalExcerpt = excerpt.length > 1200 ? `${excerpt.slice(0, 1197)}…` : excerpt;
  const location = `${meta.city}, ${meta.state}`.trim();

  const firstMessage = [
    script,
    "",
    "Research summary for this call:",
    legalExcerpt,
    "",
    "Recommended next steps for the patient:",
    nextSteps,
    "",
    "If you're the billing or claims representative, please confirm the best way to resolve discrepancies and what documentation you need next.",
  ].join("\n");

  const trimmed =
    firstMessage.length > maxChars ? `${firstMessage.slice(0, maxChars - 1)}…` : firstMessage;

  const dynamicVariables: Record<string, string> = {
    issue_summary: issueSummary,
    patient_location: location,
    legal_excerpt: legalExcerpt,
    next_steps: nextSteps,
    call_opener: script,
  };

  return {
    firstMessage: trimmed,
    dynamicVariables,
    nextSteps,
    issueSummary,
    legalExcerpt,
  };
}
