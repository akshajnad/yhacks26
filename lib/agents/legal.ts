export interface LineItem {
  code: string;
  description: string;
  amount: string;
}

export interface LegalResearchParams {
  state: string;
  city: string;
  issue: string;
  lineItems?: LineItem[];
}

// ── Prompt builder (shared between the streaming route and any direct callers) ──
export function buildLegalPrompts({
  state,
  city,
  issue,
  lineItems = [],
}: LegalResearchParams): { systemPrompt: string; userMessage: string } {
  const issueLC = issue.toLowerCase();

  const flags = {
    isSurpriseBilling: /surprise.bill|out.of.network|balance.bill/.test(issueLC),
    isEmergency: /emergency|er|emtala|urgent/.test(issueLC),
    isDenial: /deni|refused|not covered|rejected/.test(issueLC),
    isOvercharge: /overcharg|upcod|inflat|duplicate|excess/.test(issueLC),
    isMedicare: /medicare/.test(issueLC),
    isMedicaid: /medicaid|medi-cal/.test(issueLC),
    isUninsured: /uninsured|self.pay|no insurance/.test(issueLC),
    isAnesthesia: /anesthes/.test(issueLC),
    isMentalHealth: /mental|behavioral|psychiatric|substance/.test(issueLC),
    isPreAuth: /pre.auth|prior auth|preauthori/.test(issueLC),
  };

  const activeFlags = Object.entries(flags)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const systemPrompt = `
You are an expert medical billing attorney and U.S. healthcare legal researcher.

Your task is to identify specific enforceable laws, statutes, and regulations that require a hospital or insurer to pay, reimburse, reduce, or eliminate charges.

Patient location: ${city}, ${state}
Issue: "${issue}"
Issue types: ${activeFlags.length ? activeFlags.join(", ") : "general billing dispute"}

INSTRUCTIONS:

PRIORITIZE HIGH-IMPACT LAWS ONLY
Include only laws that create a clear legal obligation on the provider or insurer
Prefer federal statutes, then state statutes, then regulations
Avoid explanations, background, or commentary
REQUIRED COVERAGE CHECKLIST
Always evaluate applicability of:
No Surprises Act (42 U.S.C. § 300gg-111)
Affordable Care Act (ACA)
ERISA (29 U.S.C. § 1001 et seq.)
HIPAA (45 C.F.R. Parts 160–164)
${flags.isEmergency ? "- EMTALA (42 U.S.C. § 1395dd)" : ""}
${flags.isSurpriseBilling ? "- No Surprises Act IDR process + state surprise billing law" : ""}
${flags.isMentalHealth ? "- Mental Health Parity and Addiction Equity Act (29 U.S.C. § 1185a)" : ""}
${flags.isMedicare ? "- Medicare billing rules (42 U.S.C. § 1395 et seq.)" : ""}
${flags.isMedicaid ? "- Medicaid requirements (42 U.S.C. § 1396 et seq.)" : ""}

Also include:

${state} surprise billing, balance billing, and prompt pay laws
${state} consumer protection statute (Unfair/Deceptive Acts)
LINE-ITEM ANALYSIS
For each CPT/service (if known), include only:
Laws limiting charges OR requiring coverage
Medicare rate relevance (if applicable)
Violations (e.g., upcoding, unbundling)
STRICT OUTPUT FORMAT (MANDATORY)
UNIVERSAL PROTECTIONS (Strongest → Weakest)

For each law:

Statute: [exact citation]
Requirement: [1 sentence: what provider/insurer MUST do]
Invoke: "..." [1 sentence the patient can copy]
Applies to: [insured / uninsured / both]
LINE ITEM: [code or service name]
Strongest protection

[statute + 1 sentence requirement]

Supporting protections

[1–2 short bullets: statute + requirement]

Dispute language

"..." [1–2 sentences max]

HARD CONSTRAINTS
MAX 2 sentences per field
NO extra explanation or commentary
NO repetition
USE precise statutory citations only
OUTPUT must be concise, scannable, and usable by another agent

DO NOT SHOW ME YOUR REASONING OR YOUR THOUGHT PROCESS. DO NOT RESTATE MY INSTRUCTIONS. DO NOT SHOW YOUR PROCESSING/THINKING
AGAIN, NO MORE THAN 4 SENTENCES PER SECTION.

`.trim();

  const lineItemText = lineItems.length
    ? `\nDisputed Line Items:\n${lineItems
      .map(
        (item, i) =>
          `${i + 1}. CPT: ${item.code} | Service: ${item.description} | Billed: $${item.amount}`,
      )
      .join("\n")}`
    : "\nNo specific line items provided — research general protections for this issue type.";

  const userMessage = `
State: ${state}
City: ${city}
Issue: ${issue}
${lineItemText}

Research all applicable federal, ${state} state, and ${city} local laws that REQUIRE
the hospital or insurer to pay, reimburse, or reduce these charges.
Provide a hierarchy from most to least applicable, with exact statute citations.
`.trim();

  return { systemPrompt, userMessage };
}

// ── Convenience wrapper for non-streaming server-side use ────────────────────
export async function researchMedicalBillingLaw(
  params: LegalResearchParams,
): Promise<string> {
  const { systemPrompt, userMessage } = buildLegalPrompts(params);
  const { state } = params;

  const response = await fetch(
    "https://api.lava.so/v1/forward?u=https%3A%2F%2Fapi.perplexity.ai%2Fchat%2Fcompletions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LAVA_FORWARD_TOKEN}`,
      },
      body: JSON.stringify({
        model: "sonar-deep-research",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        search_domain_filter: [
          "law.cornell.edu",
          "cms.gov",
          "dol.gov",
          "hhs.gov",
          `${state.toLowerCase().replace(/\s+/g, "")}.gov`,
        ],
        return_citations: true,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content returned from legal research agent");
  return content;
}
