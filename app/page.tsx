"use client"

import Link from "next/link"
import { useAuth0 } from "@auth0/auth0-react"

const findings = [
  { label: "Duplicate pharmacy charge", code: "99213", amount: "$340", status: "error" },
  { label: "CPT code mismatch", code: "27447", amount: "$2,100", status: "error" },
  { label: "Responsibility miscalculation", code: "—", amount: "$618", status: "warn" },
  { label: "In-network rate confirmed", code: "93000", amount: "$95", status: "ok" },
]

const stats = [
  { figure: "9 in 10", label: "hospital bills contain at least one error", accent: "#F87171" },
  { figure: "78%", label: "who challenged got charges reduced or removed", accent: "#60A5FA" },
  { figure: "$220B", label: "in medical debt held by Americans", accent: "#FCD34D" },
  { figure: "64%", label: "of patients have never once challenged a bill", accent: "#E5E7EB" },
]

const UploadPreview = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {[
      { name: "St. Mary's Hospital Bill.pdf", size: "284 KB" },
      { name: "Aetna EOB — March 2024.pdf", size: "91 KB" },
    ].map((f) => (
      <div
        key={f.name}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          backgroundColor: "#fff",
          border: "1px solid #DDD8D0",
          borderRadius: 9,
          padding: "12px 16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 7, backgroundColor: "#F0EBE3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="15" height="15" fill="none" stroke="#6B5F52" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: "#111", fontFamily: "sans-serif", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
          <p style={{ fontSize: 11, color: "#9B8F80", fontFamily: "sans-serif", marginTop: 2 }}>{f.size}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#10B981", display: "inline-block" }} />
          <span style={{ fontSize: 11, color: "#059669", fontFamily: "sans-serif", fontWeight: 600 }}>Parsed</span>
        </div>
      </div>
    ))}
    <div style={{ border: "2px dashed #DDD8D0", borderRadius: 9, padding: "18px", textAlign: "center", backgroundColor: "#FAFAF8" }}>
      <p style={{ fontSize: 13, color: "#9B8F80", fontFamily: "sans-serif" }}>+ Drop files or click to upload</p>
    </div>
  </div>
)

const AuditPreview = () => (
  <div style={{ backgroundColor: "#fff", border: "1px solid #DDD8D0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 68px 76px 36px", padding: "10px 18px", backgroundColor: "#F2EDE6", borderBottom: "1px solid #DDD8D0" }}>
      {["Finding", "Code", "Amount", ""].map((h) => (
        <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#7A6E63", fontFamily: "sans-serif" }}>{h}</span>
      ))}
    </div>
    {findings.map((row, i) => (
      <div
        key={i}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 68px 76px 36px",
          alignItems: "center",
          padding: "12px 18px",
          borderBottom: i < findings.length - 1 ? "1px solid #F0EBE3" : "none",
          backgroundColor: row.status === "error" ? "#FFF5F5" : row.status === "warn" ? "#FFFBF0" : "#fff",
        }}
      >
        <span style={{ fontSize: 13, color: "#111", fontFamily: "sans-serif", fontWeight: 500 }}>{row.label}</span>
        <span style={{ fontSize: 11, color: "#9B8F80", fontFamily: "monospace" }}>{row.code}</span>
        <span style={{ fontSize: 13, color: "#111", fontFamily: "monospace", fontWeight: 600 }}>{row.amount}</span>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 22, height: 22, borderRadius: "50%",
          backgroundColor: row.status === "error" ? "#FEE2E2" : row.status === "warn" ? "#FEF3C7" : "#D1FAE5",
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", display: "inline-block",
            backgroundColor: row.status === "error" ? "#DC2626" : row.status === "warn" ? "#D97706" : "#059669",
          }} />
        </span>
      </div>
    ))}
  </div>
)

const LetterPreview = () => (
  <div style={{ backgroundColor: "#fff", border: "1px solid #DDD8D0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
    <div style={{ padding: "13px 18px", borderBottom: "1px solid #DDD8D0", backgroundColor: "#F2EDE6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#111", fontFamily: "sans-serif" }}>Provider Appeal Letter</span>
      <span style={{ fontSize: 10, backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: 999, padding: "3px 10px", fontFamily: "sans-serif", fontWeight: 700, letterSpacing: "0.04em" }}>READY</span>
    </div>
    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 11 }}>
      {[
        { text: "Re: Billing dispute — Claim #87441", kind: "neutral" },
        { text: "Duplicate charge on line 3 (CPT 99213) — $340", kind: "error" },
        { text: "Patient responsibility overstated by $618", kind: "error" },
      ].map((line, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: line.kind === "error" ? "#DC2626" : "#9B8F80", display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#1a1a1a", fontFamily: "sans-serif" }}>{line.text}</span>
          {line.kind === "error" && (
            <span style={{ marginLeft: "auto", fontSize: 10, backgroundColor: "#FEE2E2", color: "#991B1B", borderRadius: 4, padding: "2px 7px", fontFamily: "sans-serif", fontWeight: 600, flexShrink: 0 }}>
              Flagged
            </span>
          )}
        </div>
      ))}
    </div>
    <div style={{ padding: "12px 18px", borderTop: "1px solid #E8E2D9", display: "flex", gap: 8 }}>
      <button style={{ flex: 2, backgroundColor: "#111", color: "#fff", fontSize: 12, fontWeight: 600, padding: "11px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "sans-serif" }}>
        Download PDF
      </button>
      <button style={{ flex: 1, backgroundColor: "#F9F6F1", color: "#1a1a1a", fontSize: 12, fontWeight: 600, padding: "11px", borderRadius: 7, border: "1px solid #DDD8D0", cursor: "pointer", fontFamily: "sans-serif" }}>
        Copy text
      </button>
    </div>
  </div>
)

const steps = [
  { num: "01", title: "Upload your bill", detail: "Hospital bill and EOB. Veritas reads both.", Preview: UploadPreview },
  { num: "02", title: "Veritas audits every line", detail: "CPT codes, duplicates, denied claims — checked automatically.", Preview: AuditPreview },
  { num: "03", title: "Get your dispute letters", detail: "Pre-filled, ready to send.", Preview: LetterPreview },
]

export default function Home() {
  const { user, loginWithRedirect, isLoading } = useAuth0()

  const ctaButton = !isLoading && user ? (
    <Link href="/dashboard" style={{ backgroundColor: "#1a1a1a", color: "#fff", fontFamily: "sans-serif", fontSize: 14, fontWeight: 600, padding: "12px 24px", borderRadius: 7, textDecoration: "none", display: "inline-block" }}>
      Open workspace →
    </Link>
  ) : !isLoading ? (
    <button onClick={() => loginWithRedirect()} style={{ backgroundColor: "#1a1a1a", color: "#fff", fontFamily: "sans-serif", fontSize: 14, fontWeight: 600, padding: "12px 24px", borderRadius: 7, border: "none", cursor: "pointer" }}>
      Check your bill →
    </button>
  ) : (
    <div className="animate-pulse rounded-md" style={{ width: 160, height: 100, backgroundColor: "#E8E2D9" }} />
  )

  return (
    <div className="min-h-screen antialiased" style={{ backgroundColor: "#F9F6F1", color: "#1a1a1a", fontFamily: "'Georgia', 'Times New Roman', serif" }}>

      {/* ── HERO ── */}
      <section className="mx-auto max-w-6xl px-6" style={{ paddingTop: 96, paddingBottom: 80 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "#EFE9DF", borderRadius: 999, padding: "4px 12px", marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#DC2626", display: "inline-block" }} />
              <span style={{ fontSize: 11, fontFamily: "sans-serif", color: "#6B5F52", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Medical Billing Audit
              </span>
            </div>

            <h1 style={{ fontSize: "clamp(2.6rem, 5vw, 3.6rem)", fontWeight: 400, lineHeight: 1.1, letterSpacing: "-0.025em", color: "#111", maxWidth: 480 }}>
              Your medical bill is probably{" "}
              <em style={{ color: "#DC2626" }}>wrong.</em>
            </h1>

            <p style={{ marginTop: 18, fontSize: 17, lineHeight: 1.7, color: "#5C5248", maxWidth: 380, fontFamily: "sans-serif" }}>
             64% of patients never challenge their medical bill.
Veritas makes disputing one take minutes instead of months.
            </p>

            <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 14 }}>
              {ctaButton}
              <span style={{ fontSize: 12, color: "#9B8F80", fontFamily: "sans-serif" }}>Free · No credit card</span>
            </div>
          </div>

          {/* Tilted audit panel */}
          <div style={{ perspective: 1200 }}>
            <div style={{ transform: "rotateY(-10deg) rotateX(3deg)", transformOrigin: "left center", borderRadius: 14, border: "1px solid #E0D9CF", backgroundColor: "#fff", padding: 22, boxShadow: "0 32px 80px rgba(0,0,0,0.11), 0 4px 20px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#EF4444", display: "inline-block" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", fontFamily: "sans-serif" }}>Audit — Claim #87441</span>
                </div>
                <span style={{ backgroundColor: "#FEF3C7", color: "#92400E", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  3 issues found
                </span>
              </div>
              <AuditPreview />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#111", borderRadius: 8, padding: "12px 16px", marginTop: 14 }}>
                <div>
                  <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B7280", fontFamily: "sans-serif", marginBottom: 2 }}>Disputable amount</p>
                  <p style={{ fontSize: 22, fontWeight: 600, color: "#fff", fontFamily: "monospace" }}>$3,058</p>
                </div>
                <button style={{ backgroundColor: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "sans-serif" }}>
                  Export letters →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ backgroundColor: "#111" }}>
        <div className="mx-auto max-w-6xl" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, backgroundColor: "#2a2a2a" }}>
          {stats.map((s) => (
            <div key={s.figure} style={{ backgroundColor: "#111", padding: "70px 28px" }}>
              <p style={{ fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1, marginBottom: 10, color: s.accent }}>
                {s.figure}
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: "#9CA3AF", fontFamily: "sans-serif" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "88px 0", backgroundColor: "#F9F6F1" }}>
        <div className="mx-auto max-w-6xl px-6">
          <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 56, color: "#111" }}>
            Three steps.{" "}
            <em style={{ color: "#DC2626" }}>Minutes, not months.</em>
          </h2>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {steps.map((s) => (
              <div
                key={s.num}
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 1fr",
                  gap: 56,
                  alignItems: "start",
                  padding: "44px 0",
                  borderTop: "1px solid #E2DDD6",
                }}
              >
                {/* Left label */}
                <div style={{ paddingTop: 4 }}>
                  <span style={{ fontSize: 22, fontFamily: "monospace", color: "#C4B9AC", display: "block", marginBottom: 14 }}>{s.num}</span>
                  <h3 style={{ fontSize: 20, fontWeight: 400, color: "#111", letterSpacing: "-0.015em", marginBottom: 10, lineHeight: 1.25 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: "#7A6E63", lineHeight: 1.6, fontFamily: "sans-serif" }}>{s.detail}</p>
                </div>

                {/* Right preview */}
                <s.Preview />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ backgroundColor: "#111", padding: "80px 0" }}>
        <div className="mx-auto max-w-6xl px-6" style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 40 }}>
          <div>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 400, color: "#F9F6F1", letterSpacing: "-0.025em", lineHeight: 1.12, maxWidth: 520 }}>
              Most bills are wrong.<br />
              <em style={{ color: "#F87171" }}>Most people never find out.</em>
            </h2>
            <p style={{ marginTop: 14, fontSize: 15, color: "#6B7280", fontFamily: "sans-serif", lineHeight: 1.65 }}>
              Upload your bill. Veritas does the rest.
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            {!isLoading && user ? (
              <Link href="/dashboard" style={{ backgroundColor: "#2563EB", color: "#fff", fontFamily: "sans-serif", fontSize: 14, fontWeight: 600, padding: "14px 28px", borderRadius: 8, textDecoration: "none", display: "inline-block", whiteSpace: "nowrap" }}>
                Open workspace →
              </Link>
            ) : !isLoading ? (
              <button onClick={() => loginWithRedirect()} style={{ backgroundColor: "#2563EB", color: "#fff", fontFamily: "sans-serif", fontSize: 14, fontWeight: 600, padding: "14px 28px", borderRadius: 8, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                Check your bill free →
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #1E2333", padding: "20px 24px", backgroundColor: "#111" }}>
        <div className="mx-auto max-w-6xl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#DC2626", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "#4B5563", fontFamily: "sans-serif" }}>Veritas · Medical Billing Audit</span>
          </div>
          <span style={{ fontSize: 11, color: "#374151", fontFamily: "sans-serif" }}>Auth0 secured · HIPPA Compliant </span>
        </div>
      </footer>
    </div>
  )
}