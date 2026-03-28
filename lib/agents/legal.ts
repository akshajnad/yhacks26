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

  const systemPrompt = `You are a medical billing legal researcher. 
STRICT OUTPUT RULE: Return ONLY a numbered list of exactly 5 laws. 
NO PREAMBLE. NO META-COMMENTARY. NO THINKING BLOCKS. 
DO NOT write things like "(User is saying...)" or "(The user wants...)". 
DO NOT show your internal reasoning or thought process. 
If you show anything other than the 5 numbered items, you have failed.

Format for each item:
[number]. [Statute citation] — [What it requires the provider/insurer to do]. [How it applies to this patient's specific situation]. [One sentence the patient can say to invoke it.]

Patient: ${city}, ${state}
Issue: ${issue}
Type: ${activeFlags.length ? activeFlags.join(", ") : "general billing dispute"}`;

  const lineItemText = lineItems.length
    ? `Disputed Line Items:\n${lineItems
      .map((item, i) => `${i + 1}. CPT: ${item.code} | ${item.description} | $${item.amount}`)
      .join("\n")}`
    : "No specific line items.";

  const userMessage = `${state}, ${city} | Issue: ${issue}\n${lineItemText}\n\nReturn exactly 5 numbered laws. 3 sentences each. Nothing else.`;

  return { systemPrompt, userMessage };
}

/** Strip <think>…</think> blocks (and any other common reasoning wrappers) from model output */
function stripThinking(content: string): string {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")  // <think>...</think>
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "") // <thinking>...</thinking>
    .replace(/^[\s\S]*?<\/think>/i, "")         // unclosed leading think block
    .trim();
}

export async function researchMedicalBillingLaw(
  params: LegalResearchParams,
): Promise<string> {
  const { systemPrompt, userMessage } = buildLegalPrompts(params);

  const response = await fetch(
    "https://api.lava.so/v1/forward?u=https%3A%2F%2Fapi.openai.com%2Fv1%2Fchat%2Fcompletions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LAVA_FORWARD_TOKEN}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-search-preview",
        max_tokens: 500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const raw: string = data.choices?.[0]?.message?.content;
  if (!raw)
    throw new Error("No content returned from legal research agent");

  return stripThinking(raw);
}