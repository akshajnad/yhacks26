"use client";

import { useMemo, useState } from "react";
import {
  buildNextStepsRecommendations,
  buildOutboundCallScriptFromReport,
} from "@/lib/agents/legalCallScript";

// ── US States list ────────────────────────────────────────────────────────────
const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming", "Washington D.C.",
];

// ── Markdown renderer ──────────────────────────────────────────────────────
// Splits on newlines only AFTER full lines are accumulated, so streaming
// partial lines don't produce broken output. Inline bold/statute/code are
// handled via HTML injection; block-level elements (headers, bullets) use
// React nodes so they can be styled with classes.
function renderMarkdown(text: string) {
  const elements: React.ReactNode[] = [];
  // Split only on \n — never on mid-line partial content
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd(); // only trim trailing whitespace, keep leading

    // H2 section header
    if (/^##\s/.test(line)) {
      elements.push(
        <h2 key={i} className="legal-h2">
          {line.replace(/^##\s+/, "")}
        </h2>
      );

      // H3 sub-header
    } else if (/^###\s/.test(line)) {
      elements.push(
        <h3 key={i} className="legal-h3">
          {line.replace(/^###\s+/, "")}
        </h3>
      );

      // H4
    } else if (/^####\s/.test(line)) {
      elements.push(
        <h4 key={i} className="legal-h4">
          {line.replace(/^####\s+/, "")}
        </h4>
      );

      // Bullet list — collect consecutive bullets
    } else if (/^[-*]\s/.test(line)) {
      const bullets: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trimEnd())) {
        bullets.push(lines[i].trimEnd().replace(/^[-*]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="legal-ul">
          {bullets.map((b, bi) => (
            <li key={bi} dangerouslySetInnerHTML={{ __html: inlineFormat(b) }} />
          ))}
        </ul>
      );
      continue;

      // Numbered list — collect consecutive items
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trimEnd())) {
        items.push(lines[i].trimEnd().replace(/^\d+\.\s+/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="legal-ol">
          {items.map((item, oi) => (
            <li key={oi} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
          ))}
        </ol>
      );
      continue;

      // Horizontal rule
    } else if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="legal-hr" />);

      // Blank line → small spacer
    } else if (line.trim() === "") {
      // Only add spacer if previous element wasn't already a spacer
      if (elements.length > 0) {
        elements.push(<div key={i} className="legal-spacer" />);
      }

      // Regular paragraph
    } else {
      elements.push(
        <p key={i} className="legal-p"
          dangerouslySetInnerHTML={{ __html: inlineFormat(line) }}
        />
      );
    }

    i++;
  }

  return elements;
}

function inlineFormat(text: string): string {
  return (
    text
      // Bold **text**
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic *text* (not adjacent to another *)
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="legal-code">$1</code>')
      // Statute citations: highlight § signs
      .replace(
        /(§+\s?[\d\w.–-]+)/g,
        '<span class="legal-statute">$1</span>',
      )
      // Markdown links
      .replace(
        /\[(.+?)\]\((.+?)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="legal-link">$1</a>',
      )
  );
}

// ── Status badge for detected flags ──────────────────────────────────────────
const FLAG_LABELS: Record<string, string> = {
  isSurpriseBilling: "Surprise Billing",
  isEmergency: "Emergency",
  isDenial: "Claim Denial",
  isOvercharge: "Overcharge",
  isMedicare: "Medicare",
  isMedicaid: "Medicaid",
  isUninsured: "Uninsured / Self-Pay",
  isAnesthesia: "Anesthesia",
  isMentalHealth: "Mental Health",
  isPreAuth: "Prior Authorization",
};

function detectFlags(issue: string) {
  const lc = issue.toLowerCase();
  return Object.entries({
    isSurpriseBilling: /surprise.bill|out.of.network|balance.bill/.test(lc),
    isEmergency: /emergency|er|emtala|urgent/.test(lc),
    isDenial: /deni|refused|not covered|rejected/.test(lc),
    isOvercharge: /overcharg|upcod|inflat|duplicate|excess/.test(lc),
    isMedicare: /medicare/.test(lc),
    isMedicaid: /medicaid|medi-cal/.test(lc),
    isUninsured: /uninsured|self.pay|no insurance/.test(lc),
    isAnesthesia: /anesthes/.test(lc),
    isMentalHealth: /mental|behavioral|psychiatric|substance/.test(lc),
    isPreAuth: /pre.auth|prior auth|preauthori/.test(lc),
  })
    .filter(([, v]) => v)
    .map(([k]) => k);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LegalResearchPage() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [issue, setIssue] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedCtx, setSubmittedCtx] = useState<{
    city: string;
    state: string;
    issue: string;
  } | null>(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [callLoading, setCallLoading] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [callSuccess, setCallSuccess] = useState<string | null>(null);

  const detectedFlags = detectFlags(issue);

  const callPreview = useMemo(() => {
    if (!result || !submittedCtx) return null;
    return buildOutboundCallScriptFromReport(result, {
      city: submittedCtx.city,
      state: submittedCtx.state,
      issue: submittedCtx.issue || "Medical billing dispute",
    });
  }, [result, submittedCtx]);

  const nextStepsPreview = useMemo(() => {
    if (!result || !submittedCtx) return null;
    return buildNextStepsRecommendations(result, {
      city: submittedCtx.city,
      state: submittedCtx.state,
      issue: submittedCtx.issue || "Medical billing dispute",
    });
  }, [result, submittedCtx]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim() || !state || !issue.trim()) return;

    setLoading(true);
    setStreaming(false);
    setResult(null);
    setError(null);
    setSubmittedCtx({ city: city.trim(), state, issue: issue.trim() });

    try {
      const res = await fetch("/api/legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city.trim(), state, issue: issue.trim() }),
      });

      // Non-OK responses come back as JSON with an error field
      if (!res.ok || res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      // Happy path: stream SSE tokens
      if (!res.body) {
        setError("No response body received.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setStreaming(true);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          // SSE spec: data field starts with "data: " (6 chars with the space).
          // Use slice(6) NOT slice(5).trim() — trimming eats leading spaces
          // from tokens like " the", " In", etc. causing missing spaces.
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(6); // skip exactly "data: "
          if (payload === "[DONE]") continue;
          // Unescape \n that the server encoded as literal backslash-n
          accumulated += payload.replace(/\\n/g, "\n");
          setResult(accumulated);
        }
      }

      setStreaming(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setError(msg);
      setLoading(false);
      setStreaming(false);
    }
  }

  async function handleOutboundCall(e: React.FormEvent) {
    e.preventDefault();
    if (!result?.trim() || !submittedCtx) return;

    setCallLoading(true);
    setCallError(null);
    setCallSuccess(null);

    try {
      const res = await fetch("/api/legal/outbound-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toNumber: phoneNumber.trim(),
          legalReport: result,
          city: submittedCtx.city,
          state: submittedCtx.state,
          issue: submittedCtx.issue,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCallError(typeof data.error === "string" ? data.error : "Call request failed.");
        return;
      }
      setCallSuccess(
        data.message ??
          "Call initiated. Answer your phone when the agent dials out (requires ElevenLabs + Twilio setup).",
      );
    } catch (err) {
      setCallError(err instanceof Error ? err.message : "Network error");
    } finally {
      setCallLoading(false);
    }
  }

  return (
    <>
      <style>{`
        /* ── Page layout ── */
        .legal-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
          padding: 2.5rem 1rem 4rem;
        }

        .legal-container {
          max-width: 860px;
          margin: 0 auto;
        }

        /* ── Hero ── */
        .legal-hero {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .legal-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(139,92,246,0.15);
          border: 1px solid rgba(139,92,246,0.35);
          color: #c4b5fd;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.3rem 0.75rem;
          border-radius: 999px;
          margin-bottom: 1.25rem;
        }

        .legal-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #a78bfa;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .legal-title {
          font-size: 2.4rem;
          font-weight: 800;
          line-height: 1.15;
          background: linear-gradient(135deg, #fff 0%, #c4b5fd 60%, #818cf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.75rem;
        }

        .legal-subtitle {
          color: #94a3b8;
          font-size: 1rem;
          max-width: 520px;
          margin: 0 auto;
          line-height: 1.65;
        }

        /* ── Card ── */
        .legal-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 1.25rem;
          padding: 2rem 2rem;
          backdrop-filter: blur(12px);
          margin-bottom: 2rem;
        }

        /* ── Form ── */
        .legal-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 600px) {
          .legal-form-grid { grid-template-columns: 1fr; }
          .legal-title { font-size: 1.75rem; }
        }

        .legal-field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .legal-label {
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .legal-input, .legal-select, .legal-textarea {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.625rem;
          color: #fff;
          font-size: 0.9rem;
          padding: 0.65rem 0.9rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
          box-sizing: border-box;
        }

        .legal-input::placeholder, .legal-textarea::placeholder {
          color: #475569;
        }

        .legal-input:focus, .legal-select:focus, .legal-textarea:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.2);
        }

        .legal-select option {
          background: #1e1b4b;
          color: #fff;
        }

        .legal-textarea {
          min-height: 120px;
          resize: vertical;
          font-family: inherit;
        }

        /* ── Flags ── */
        .legal-flags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.5rem;
        }

        .legal-flag-chip {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          background: rgba(124,58,237,0.2);
          border: 1px solid rgba(124,58,237,0.4);
          color: #c4b5fd;
          letter-spacing: 0.03em;
        }

        /* ── Submit button ── */
        .legal-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          margin-top: 1.25rem;
          padding: 0.8rem 1.5rem;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          border: none;
          border-radius: 0.75rem;
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(124,58,237,0.35);
        }

        .legal-submit:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(124,58,237,0.5);
        }

        .legal-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* ── Spinner ── */
        .legal-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Loading state ── */
        .legal-loading {
          text-align: center;
          padding: 3rem 1rem;
        }

        .legal-loading-orbit {
          width: 64px;
          height: 64px;
          border: 3px solid rgba(124,58,237,0.15);
          border-top-color: #7c3aed;
          border-right-color: #818cf8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1.25rem;
        }

        .legal-loading-title {
          color: #e2e8f0;
          font-size: 1.05rem;
          font-weight: 600;
          margin-bottom: 0.4rem;
        }

        .legal-loading-sub {
          color: #64748b;
          font-size: 0.85rem;
        }

        /* ── Error ── */
        .legal-error {
          background: rgba(220,38,38,0.1);
          border: 1px solid rgba(220,38,38,0.25);
          border-radius: 0.75rem;
          padding: 1rem 1.25rem;
          color: #fca5a5;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
        }

        /* ── Result ── */
        .legal-result-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }

        .legal-result-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .legal-result-title {
          color: #e2e8f0;
          font-size: 1.05rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .legal-result-sub {
          color: #64748b;
          font-size: 0.78rem;
          margin-top: 0.15rem;
        }

        .legal-result-copy {
          margin-left: auto;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.35rem 0.75rem;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }

        .legal-result-copy:hover {
          background: rgba(255,255,255,0.1);
          color: #e2e8f0;
        }

        /* ── Markdown styles ── */
        .legal-markdown {
          color: #cbd5e1;
          font-size: 0.9rem;
          line-height: 1.75;
        }

        .legal-h2 {
          color: #e2e8f0;
          font-size: 1.1rem;
          font-weight: 700;
          margin: 1.75rem 0 0.6rem;
          padding: 0.5rem 0.75rem;
          background: rgba(124,58,237,0.1);
          border-left: 3px solid #7c3aed;
          border-radius: 0 0.4rem 0.4rem 0;
        }

        .legal-h3 {
          color: #c4b5fd;
          font-size: 0.95rem;
          font-weight: 600;
          margin: 1.25rem 0 0.4rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .legal-h3::before {
          content: "";
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #7c3aed;
          flex-shrink: 0;
        }

        .legal-h4 {
          color: #94a3b8;
          font-size: 0.85rem;
          font-weight: 600;
          margin: 1rem 0 0.3rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .legal-p {
          margin: 0.4rem 0;
        }

        .legal-ul, .legal-ol {
          padding-left: 1.4rem;
          margin: 0.4rem 0 0.8rem;
        }

        .legal-ul li, .legal-ol li {
          margin: 0.3rem 0;
          color: #94a3b8;
        }

        .legal-ul li::marker { color: #7c3aed; }
        .legal-ol li::marker { color: #7c3aed; font-weight: 700; }

        .legal-spacer { height: 0.25rem; }

        .legal-hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.07);
          margin: 1.25rem 0;
        }

        .legal-code {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          padding: 0.1em 0.35em;
          font-family: "Menlo", "Monaco", "Consolas", monospace;
          font-size: 0.85em;
          color: #a78bfa;
        }

        .legal-link {
          color: #818cf8;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .legal-link:hover { color: #c4b5fd; }

        /* ── Statute citation highlight ── */
        .legal-statute {
          font-weight: 600;
          color: #a78bfa;
          font-variant-numeric: tabular-nums;
        }

        /* ── Better paragraph spacing for prose output ── */
        .legal-p + .legal-p {
          margin-top: 0.6rem;
        }

        /* ── Streaming cursor ── */
        .legal-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background: #7c3aed;
          margin-left: 2px;
          vertical-align: text-bottom;
          border-radius: 1px;
          animation: blink 0.9s step-end infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* ── Disclaimer ── */
        .legal-disclaimer {
          margin-top: 1.5rem;
          padding: 0.75rem 1rem;
          background: rgba(245,158,11,0.08);
          border: 1px solid rgba(245,158,11,0.2);
          border-radius: 0.625rem;
          color: #fbbf24;
          font-size: 0.75rem;
          display: flex;
          gap: 0.5rem;
          align-items: flex-start;
        }

        .legal-call-section {
          margin-top: 1.75rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .legal-call-title {
          color: #e2e8f0;
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 0.35rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .legal-call-sub {
          color: #64748b;
          font-size: 0.78rem;
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .legal-call-preview {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 0.625rem;
          padding: 0.85rem 1rem;
          color: #94a3b8;
          font-size: 0.8rem;
          line-height: 1.55;
          margin-bottom: 1rem;
          max-height: 140px;
          overflow-y: auto;
        }

        .legal-call-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: flex-end;
        }

        .legal-call-row .legal-field {
          flex: 1;
          min-width: 200px;
        }

        .legal-call-btn {
          padding: 0.65rem 1.15rem;
          background: linear-gradient(135deg, #059669, #047857);
          border: none;
          border-radius: 0.625rem;
          color: #fff;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.2s;
        }

        .legal-call-btn:hover:not(:disabled) {
          opacity: 0.92;
        }

        .legal-call-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .legal-call-ok {
          margin-top: 0.85rem;
          padding: 0.65rem 0.85rem;
          background: rgba(16,185,129,0.12);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: 0.5rem;
          color: #6ee7b7;
          font-size: 0.78rem;
        }

        .legal-call-err {
          margin-top: 0.85rem;
          padding: 0.65rem 0.85rem;
          background: rgba(220,38,38,0.12);
          border: 1px solid rgba(220,38,38,0.25);
          border-radius: 0.5rem;
          color: #fca5a5;
          font-size: 0.78rem;
        }

        .legal-phone-hint {
          margin: 0.35rem 0 0;
          font-size: 0.72rem;
          line-height: 1.45;
          color: #64748b;
        }
      `}</style>

      <div className="legal-page">
        <div className="legal-container">
          {/* Hero */}
          <div className="legal-hero">
            <div className="legal-badge">
              <span className="legal-badge-dot" />
              AI Legal Research Agent
            </div>
            <h1 className="legal-title">Know Your Rights.<br />Fight Your Bill.</h1>
            <p className="legal-subtitle">
              Enter your location and describe your medical billing issue. Our AI agent will research every federal, state, and local law that protects you.
            </p>
          </div>

          {/* Form card */}
          <div className="legal-card">
            <form onSubmit={handleSubmit}>
              <div className="legal-form-grid">
                <div className="legal-field">
                  <label className="legal-label" htmlFor="legal-city">City</label>
                  <input
                    id="legal-city"
                    className="legal-input"
                    type="text"
                    placeholder="e.g. Los Angeles"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>
                <div className="legal-field">
                  <label className="legal-label" htmlFor="legal-state">State</label>
                  <select
                    id="legal-state"
                    className="legal-select"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                  >
                    <option value="">Select a state…</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="legal-field">
                <label className="legal-label" htmlFor="legal-issue">Describe your billing issue</label>
                <textarea
                  id="legal-issue"
                  className="legal-textarea"
                  placeholder="e.g. I received a surprise bill after an emergency room visit for an out-of-network anesthesiologist. My insurance denied the claim and I'm being asked to pay $8,400."
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  required
                />
              </div>

              <div className="legal-field" style={{ marginTop: "0.25rem" }}>
                <label className="legal-label" htmlFor="legal-phone">
                  Phone number for outbound call
                </label>
                <input
                  id="legal-phone"
                  className="legal-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+1 555 123 4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  aria-describedby="legal-phone-hint"
                />
                <p id="legal-phone-hint" className="legal-phone-hint">
                  After the legal report finishes, use “Call this number” below to dial this line via your ElevenLabs agent.
                </p>
              </div>

              {/* Auto-detected flags */}
              {detectedFlags.length > 0 && (
                <div className="legal-flags" aria-label="Detected issue types">
                  {detectedFlags.map((flag) => (
                    <span key={flag} className="legal-flag-chip">
                      ✦ {FLAG_LABELS[flag] ?? flag}
                    </span>
                  ))}
                </div>
              )}

              <button
                id="legal-submit-btn"
                type="submit"
                className="legal-submit"
                disabled={loading || !city.trim() || !state || !issue.trim()}
              >
                {loading ? (
                  <>
                    <span className="legal-spinner" />
                    Researching laws…
                  </>
                ) : (
                  <>
                    ⚖️ Research My Legal Protections
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Loading state (waiting for first token) */}
          {loading && (
            <div className="legal-card legal-loading">
              <div className="legal-loading-orbit" />
              <p className="legal-loading-title">Connecting to research agent…</p>
              <p className="legal-loading-sub">
                Searching federal statutes, {submittedCtx?.state ?? "state"} regulations, and {submittedCtx?.city ?? "local"} ordinances.
                This may take 30–90 seconds.
              </p>
            </div>
          )}

          {/* Error */}
          {error && !loading && !streaming && (
            <div className="legal-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          {/* Result — shown while streaming AND after complete */}
          {result && (
            <div className="legal-card">
              <div className="legal-result-header">
                <div className="legal-result-icon">⚖️</div>
                <div>
                  <div className="legal-result-title">
                    {streaming ? "Researching laws…" : "Legal Research Report"}
                  </div>
                  <div className="legal-result-sub">
                    {submittedCtx?.city}, {submittedCtx?.state} · Powered by Perplexity Sonar Deep Research
                  </div>
                </div>
                {!streaming && (
                  <button
                    className="legal-result-copy"
                    onClick={() => navigator.clipboard.writeText(result)}
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                )}
              </div>

              <div className="legal-markdown">
                {renderMarkdown(result)}
                {streaming && <span className="legal-cursor" />}
              </div>

              {!streaming && (
                <>
                  <div className="legal-disclaimer">
                    <span>⚠️</span>
                    <span>
                      This report is AI-generated for informational purposes only and does not constitute legal advice. Consult a licensed attorney before taking legal action.
                    </span>
                  </div>

                  <div className="legal-call-section">
                    <div className="legal-call-title">
                      <span aria-hidden>📞</span>
                      Outbound call (demo)
                    </div>
                    <p className="legal-call-sub">
                      Starts an ElevenLabs Conversational AI call to the number you entered above via{" "}
                      <code className="legal-code">POST /v1/convai/twilio/outbound-call</code>{" "}
                      (direct server-side API — Lava does not support forwarding this endpoint). Set{" "}
                      <code className="legal-code">ELEVENLABS_API_KEY</code>,{" "}
                      <code className="legal-code">ELEVENLABS_AGENT_ID</code>, and{" "}
                      <code className="legal-code">ELEVENLABS_AGENT_PHONE_NUMBER_ID</code> in{" "}
                      <code className="legal-code">.env.local</code>. Opening context is sent as{" "}
                      <code className="legal-code">first_message</code> override.
                    </p>

                    {callPreview && (
                      <div>
                        <div className="legal-label" style={{ marginBottom: "0.35rem" }}>
                          Call opener (included in agent first message)
                        </div>
                        <div className="legal-call-preview">{callPreview.script}</div>
                      </div>
                    )}

                    {nextStepsPreview && (
                      <div style={{ marginTop: "1rem" }}>
                        <div className="legal-label" style={{ marginBottom: "0.35rem" }}>
                          Next steps (sent to the agent as first message + dynamic variables)
                        </div>
                        <div className="legal-call-preview" style={{ whiteSpace: "pre-wrap" }}>
                          {nextStepsPreview}
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleOutboundCall}>
                      {phoneNumber.trim() ? (
                        <p className="legal-call-sub" style={{ marginBottom: "0.75rem" }}>
                          Using number: <strong style={{ color: "#e2e8f0" }}>{phoneNumber.trim()}</strong> (from the form above)
                        </p>
                      ) : (
                        <p className="legal-call-sub" style={{ marginBottom: "0.75rem", color: "#fbbf24" }}>
                          Enter a phone number in the form above, then return here to place the call.
                        </p>
                      )}
                      <button
                        type="submit"
                        className="legal-call-btn"
                        style={{ width: "100%" }}
                        disabled={callLoading || !phoneNumber.trim()}
                      >
                        {callLoading ? "Requesting call…" : "Call this number"}
                      </button>
                    </form>

                    {callSuccess && <div className="legal-call-ok">{callSuccess}</div>}
                    {callError && <div className="legal-call-err">{callError}</div>}

                    <div className="legal-disclaimer" style={{ marginTop: "1rem" }}>
                      <span>⚠️</span>
                      <span>
                        Only call numbers you own or have consent to reach. Automated calls may be regulated (e.g. TCPA).
                        This is a demo — no warranty of connectivity.
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
