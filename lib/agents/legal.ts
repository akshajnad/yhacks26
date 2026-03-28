import { Lava } from "@lavapayments/nodejs";
const lava = new Lava(process.env.LAVA_SECRET_KEY);

interface LineItem {
  code: string
  description: string
  amount: number
}

async function researchMedicalBillingLaw(state: string, city: string, issue: string, lineItems: LineItem[] = []) {
  const issueLC = issue.toLowerCase();

  // ── Auto-detect issue context ──────────────────────────────────────────────
  const flags = {
    isSurpriseBilling: /surprise.bill|out.of.network|balance.bill/.test(
      issueLC,
    ),
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

  // ── Build adaptive system prompt ───────────────────────────────────────────
  const SYSTEM_PROMPT = `
You are an expert medical billing attorney and legal researcher specializing in US healthcare law.

Your job is to help patients dispute medical bills by identifying SPECIFIC laws, statutes,
and regulations that REQUIRE hospitals or insurers to pay, reimburse, credit, or reduce charges.

The patient is located in: ${city}, ${state}.
Their issue is: "${issue}"
Detected issue types: ${activeFlags.length ? activeFlags.join(", ") : "general billing dispute"}

RESEARCH INSTRUCTIONS:

1. UNIVERSAL PROTECTIONS — laws that apply to ALL line items:
   - Always check: No Surprises Act (42 U.S.C. § 300gg-111), ACA, ERISA, HIPAA
   ${flags.isEmergency ? "- EMTALA (42 U.S.C. § 1395dd) — must be cited for emergency cases" : ""}
   ${flags.isSurpriseBilling ? "- No Surprises Act IDR process and its ${state} equivalent" : ""}
   ${flags.isMentalHealth ? "- Mental Health Parity and Addiction Equity Act (MHPAEA)" : ""}
   ${flags.isMedicare ? "- CMS Medicare billing rules, MSP provisions" : ""}
   ${flags.isMedicaid ? "- Medicaid EPSDT, state plan requirements" : ""}
   - ${state}-specific: surprise billing law, prompt pay law, balance billing ban,
     insurance code violations, Attorney General consumer protection statutes
   - ${city} municipal health code protections if any exist

2. LINE ITEM SPECIFIC PROTECTIONS — for each CPT code or service:
   - Laws capping charges for that specific service
   - Laws requiring coverage of that service
   - Medicare reference rate applicability
   - Prohibition on upcoding or unbundling for that code
   ${flags.isAnesthesia ? "- Anesthesia-specific: No Surprises Act § 2799B-2, state anesthesia billing rules" : ""}

3. OUTPUT FORMAT — strict hierarchy:

## UNIVERSAL PROTECTIONS (ranked strongest to weakest)
For each law:
- Statute: [exact citation]
- What it requires: [what hospital/insurer must do]
- How to invoke: [exact language patient should use in dispute letter]
- Applies to: [insured / uninsured / both]

## LINE ITEM: [code] — [description]
### 1. Strongest protection
### 2. Supporting protections
### 3. Dispute letter language for this line item

## RECOMMENDED DISPUTE STRATEGY
Summarize the top 3 most powerful arguments given this specific state, city, and issue.

Always cite REAL statutes with exact section numbers. Do not generalize.
`;

  // ── Build user message ─────────────────────────────────────────────────────
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
`;

  // ── API call ───────────────────────────────────────────────────────────────
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
          { role: "system", content: SYSTEM_PROMPT },
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

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

const result = await researchMedicalBillingLaw(
  "California",
  "Los Angeles",
  "surprise billing after emergency room visit with out-of-network anesthesiologist",
);
