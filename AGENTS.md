# Agents

MedBill Agent uses a lightweight multi-agent architecture focused on two core agents.

1. Audit Agent
2. Communication Agent

Document parsing is treated as a supporting service.

---

## Pipeline Overview

User uploads:

- medical bill
- insurance EOB

Processing flow:

1. OCR / document parsing
2. data normalization
3. audit engine identifies issues
4. communication engine generates dispute assets
5. action layer executes workflows

---

## Audit Agent

Purpose:
Detect billing issues by comparing the provider bill with the insurance EOB.

Responsibilities:

- identify duplicate charges
- detect mismatches between bill and EOB responsibility
- detect insurance denials
- detect network inconsistencies
- estimate potential savings
- recommend best dispute path

Inputs:

- parsed bill JSON
- parsed EOB JSON

Outputs:
issues
recommended_path
estimated_savings


---

## Communication Agent

Purpose:
Generate professional dispute communication.

Responsibilities:

- draft provider dispute email
- generate insurance appeal letters
- create call scripts
- guide follow-up messaging

Inputs:

- audit result JSON
- parsed bill data
- parsed EOB data

Outputs:

- provider dispute email
- insurance appeal draft
- call script