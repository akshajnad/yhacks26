# Architecture

## Overview

MedBill Agent analyzes medical billing documents and generates dispute actions.

System flow:

Upload → OCR → Structured Data → Audit Engine → Communication Engine → Actions

---

## Frontend

Framework:
Next.js + React

Pages:

Upload Page
- upload medical bill
- upload EOB
- trigger analysis

Results Page
- show detected issues
- display estimated savings
- recommended action path

Action Center
- generated dispute email
- insurance appeal
- call script

---

## Backend Pipeline

### Step 1: Document Parsing

Use Gemini API to extract structured data from uploaded PDFs or images.

Outputs:

- provider
- total billed
- patient responsibility
- insurer payment
- line items

---

### Step 2: Data Normalization

Clean parsed output:

- currency formatting
- date formatting
- line item grouping
- duplicate detection hints

---

### Step 3: Audit Engine

Compares bill and EOB.

Rules include:

- bill exceeds EOB responsibility
- duplicate service codes
- denied claim
- network mismatch

Output:


issues
recommended_path
estimated_savings


---

### Step 4: Communication Engine

Uses templates + LLM generation to create:

- provider dispute email
- insurance appeal letter
- billing hold request
- phone call script

---

### Step 5: Action Layer

Handles agentic actions.

Examples:

- send dispute email
- initiate follow-up workflow
- trigger voice call demo

Tools:

- Lava API
- ElevenLabs