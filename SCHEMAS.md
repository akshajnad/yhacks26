# Prompts

## Document Parsing Prompt

Extract structured billing information from the provided document.

Return JSON only.

Fields:

provider_name  
patient_name  
date_of_service  
account_number  
claim_number  
total_billed  
insurer_paid  
patient_responsibility  
network_status  
line_items  

---

## Audit Prompt

Compare the medical bill and EOB.

Identify:

- duplicate charges
- mismatched patient responsibility
- denied claims
- suspicious network status

Return JSON:


issues
recommended_path
estimated_savings
summary


---

## Communication Prompt

Generate dispute communication based on the audit result.

Types:

- provider dispute email
- insurance appeal letter
- billing hold request
- phone call script

Tone:

- professional
- concise
- factual