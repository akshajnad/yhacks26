# MedBill Agent

MedBill Agent is an AI-powered medical bill defense assistant that helps patients understand and dispute confusing or incorrect healthcare charges.

Users upload a **medical bill and Explanation of Benefits (EOB)**, and the system:

1. Parses both documents
2. Detects likely billing or claims issues
3. Recommends the best dispute path
4. Generates provider dispute emails, insurer appeal drafts, and call scripts
5. Optionally triggers agentic actions through external tools

## Problem

Medical bills are complex and difficult to verify.

Patients often encounter:

- duplicate charges
- incorrect out-of-network billing
- mismatches between provider bills and insurance EOBs
- confusing claim denials
- unclear patient responsibility

Most patients do not know:

- whether the hospital or insurer made the mistake
- how to compare bills and EOBs
- how to dispute incorrect charges
- what language to use when contacting providers or insurers

## Solution

MedBill Agent analyzes both the **provider bill** and **insurance EOB** to detect inconsistencies and guide the user through the correct dispute path.

Instead of spending hours calling billing departments, users receive:

- a clear explanation of the issue
- recommended next steps
- ready-to-send dispute communication

## Key Features

- Upload medical bill and EOB
- OCR + document parsing
- Automated billing audit
- Issue detection
- Estimated savings calculation
- Provider dispute email generation
- Insurance appeal generation
- Guided billing call scripts
- Voice-enabled demo interaction

## Tech Stack

Frontend
- Next.js
- React
- TypeScript

Backend
- Node.js or Python

AI / APIs
- Gemini API for document parsing
- Lava API for action orchestration
- ElevenLabs for voice interaction

## Project Structure
README.md
AGENTS.md
ARCHITECTURE.md
DEMO.md
PROMPTS.md
SCHEMAS.md
TASKS.md
KNOWN_ISSUES.md


## Setup

Frontend


cd frontend
npm install
npm run dev


Backend


cd backend
npm install
npm run dev


## Vision

Medical bills should not be harder to understand than taxes.

Our goal is to build an AI system that helps patients **understand, challenge, and resolve medical billing issues automatically.**