# Veritas

**AI-powered medical bill defense.** Upload your bill. Veritas fights it.

---

## Tracks

**Personal AI Agent** — Veritas acts as a fully autonomous agent on behalf of the patient — analyzing bills, drafting disputes, making phone calls, and following up, all without human intervention.

**Healthcare (Societal Impact)** — 80% of U.S. medical bills contain errors. Veritas detects and disputes them automatically, preventing medical debt for patients who lack the time or expertise to fight back.

**ElevenLabs** — A voice agent powered by ElevenLabs calls healthcare providers and insurance companies directly to dispute charges in real time, handles follow-up callbacks, and delivers full transcripts to the patient.

**Lava API** — Every AI model and external service is accessed through Lava's unified gateway. Lava also orchestrates the ElevenLabs–Twilio voice pipeline end-to-end — from synthesis to telephony — through a single integration layer.

**MBZUAI K2 Think** — We tuned K2 Think V2's inference path to reduce latency without sacrificing answer quality, focusing on reasoning depth, prefill/decode behavior, tokens-per-second, and KV-cache efficiency rather than superficial sampling knobs.

---

## The Problem

Medical billing errors affect millions of Americans every year. Studies estimate that nearly **80% of hospital bills contain mistakes** — duplicate charges, incorrectly applied insurance benefits, upcoded procedures, and more.

Most patients never challenge these errors. Doing so requires decoding CPT codes, interpreting insurance Explanations of Benefits, and navigating months of healthcare bureaucracy. The average person does not have the time, knowledge, or confidence to fight back.

**We surveyed 405 people.** 63.5% said they had received a medical bill with incorrect charges. The majority either didn't dispute them or didn't know where to begin. We also spoke with a healthcare provider in New York City who confirmed that patients regularly receive incorrect charges and are often too intimidated to act — and that these errors can lead to lasting medical debt.

---

## What Veritas Does

Veritas turns a confusing medical bill into a resolved dispute.

1. **Upload** — The patient uploads their medical bill and insurance EOB.
2. **Analyze** — Veritas parses every line item, deciphers CPT codes, and scans for errors like duplicate charges, unapplied insurance benefits, and upcoded procedures.
3. **Explain** — Findings are presented in plain language so the patient understands exactly what went wrong and how much they were overcharged.
4. **Dispute** — Three specialized agents take action:
   - **Email Agent** — Drafts and sends a formal dispute letter to the healthcare provider.
   - **Legal Research Agent** — Powered by Perplexity Sonar, finds legal clauses and regulatory justifications to build the strongest possible case.
   - **Voice Agent** — Built with ElevenLabs + Twilio (orchestrated through Lava), calls the provider and insurer directly, disputes the charges in real time, and handles follow-up callbacks.
5. **Track** — Full call transcripts, plain-language summaries, and dispute status are available throughout the process.

The patient never picks up the phone. Veritas handles everything.

---

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Auth0](https://img.shields.io/badge/Auth0-EB5424?style=for-the-badge&logo=auth0&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_API-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![Perplexity](https://img.shields.io/badge/Perplexity_Sonar-1FB8CD?style=for-the-badge&logo=perplexity&logoColor=white)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-000000?style=for-the-badge&logo=elevenlabs&logoColor=white)
![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white)
![Lava](https://img.shields.io/badge/Lava_API-FF6B35?style=for-the-badge)
![K2 Think](https://img.shields.io/badge/K2_Think_V2-0055FF?style=for-the-badge)
