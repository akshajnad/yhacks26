import type { AnalysisResult, IssueType } from "@/types/analysis"

export const TARGET_GMAIL_SENDER = "akshajnadn@gmail.com"

export interface GeneratedEmailDraft {
  recipientType: "provider" | "insurer"
  to: string
  subject: string
  body: string
}

const PROVIDER_ISSUES = new Set<IssueType>([
  "DUPLICATE_CHARGE",
  "UPCODING",
  "OVERCHARGE",
  "BILL_EOB_MISMATCH",
  "BALANCE_BILLING",
])

const INSURER_ISSUES = new Set<IssueType>(["DENIAL_FLAG"])

function fallbackRecipientType(result: AnalysisResult): "provider" | "insurer" {
  let providerScore = 0
  let insurerScore = 0

  for (const issue of result.detectedIssues ?? []) {
    if (PROVIDER_ISSUES.has(issue.type)) providerScore += 1
    if (INSURER_ISSUES.has(issue.type)) insurerScore += 1
  }

  if (insurerScore > providerScore) return "insurer"
  return "provider"
}

export function getFallbackDraft(result: AnalysisResult): GeneratedEmailDraft {
  const recipientType = fallbackRecipientType(result)
  const to =
    recipientType === "provider"
      ? result.extractedFields.providerEmail
      : result.extractedFields.insurerEmail

  const subjectTarget = recipientType === "provider" ? "billing statement" : "claim adjudication"
  const claimNumber = result.extractedFields.claimNumber ?? "(claim number unavailable)"
  const serviceDate = result.extractedFields.serviceDate ?? "(service date unavailable)"
  const memberID = result.extractedFields.memberID ?? "(member ID unavailable)"

  const issueLines = (result.detectedIssues ?? [])
    .slice(0, 5)
    .map((issue) => `- ${issue.type}: ${issue.description}`)
    .join("\n")

  return {
    recipientType,
    to: to ?? "",
    subject: `Request for review of ${subjectTarget} (Claim ${claimNumber})`,
    body: [
      "Hello,",
      "",
      `I am writing to dispute potential billing errors related to service date ${serviceDate}.`,
      `Claim Number: ${claimNumber}`,
      `Member ID: ${memberID}`,
      "",
      "Key issues identified:",
      issueLines || "- Potential mismatch between the medical bill and EOB requires review.",
      "",
      "Please review this account and provide a corrected statement or written explanation for each discrepancy.",
      "",
      "Thank you,",
      "Akshaj Nadimpalli",
      "Phone: 8609962832"
    ].join("\n"),
  }
}

export function toBase64Url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

export function buildRfc2822Message({
  to,
  subject,
  body,
}: {
  to: string
  subject: string
  body: string
}): string {
  const normalizedBody = body.replace(/\r?\n/g, "\r\n")
  return [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=\"UTF-8\"", "", normalizedBody].join(
    "\r\n"
  )
}
