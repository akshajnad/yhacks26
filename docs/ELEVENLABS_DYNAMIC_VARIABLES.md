# ElevenLabs outbound call — dynamic variables and reference data

## Problem this fixes

ElevenLabs ConvAI receives `dynamic_variables` on each outbound call. Previously:

- Empty `member_id`, `claim_number`, etc. were **removed** from the payload (filter dropped empty strings), so template placeholders like `{{member_id}}` never resolved.
- IDs were only read from `patientContext`, not merged with `analysis.extractedFields` or `callBrief.referenceNumbers`, so values present on the analysis JSON could be missed.

## Current behavior

1. **`mergeReferenceData()`** (`lib/integrations/elevenlabs.ts`) builds one merged view from, in order:
   - `outreachBrief.patientContext`
   - `callBrief.referenceNumbers`
   - `outreachBrief.analysis.extractedFields`

2. **Missing values** are sent as the literal string `not provided` so keys are **always present** for core reference fields. The model can read exact IDs from the **system prompt** block and from **dynamic variables**.

3. **`buildSystemPrompt()`** includes a **REFERENCE NUMBERS AND ACCOUNT DETAILS** section listing case ID, member ID, claim #, account #, dates, amounts, CPT codes, provider/insurer names, etc.

4. **`buildDynamicVariables()`** includes:
   - Snake_case and camelCase aliases (`member_id` / `memberID`, `claim_number` / `claimNumber`, …).
   - **`reference_numbers_summary`**: a single multiline string with all key numbers for one template variable.
   - **`medbill_context`**: one block that repeats IDs, issues, resolution, and opening — use **`{{medbill_context}}`** alone in the system prompt if per-field variables are not substituted.
   - **`system_prompt`**: full instructions (for `{{system_prompt}}` in the agent UI when API prompt override is off).

## Why the agent might not “see” IDs

ElevenLabs does **not** parse the JSON blob of `dynamic_variables` automatically. Each value is injected only where your **agent template** uses the matching placeholder, e.g. `{{member_id}}`. If the template never includes `{{member_id}}`, that value never appears in the LLM context.

**Fix:** In the ConvAI agent editor, either:

- Set **System prompt** to `{{system_prompt}}` or `{{medbill_context}}`, **or**
- Add the placeholders you need (`{{member_id}}`, `{{claim_number}}`, …) to the system prompt / first message text.

Register dynamic variables in the agent if your workspace requires it.

5. **`POST /api/outreach/elevenlabs/call`** uses `mergeDynamicVariablesForOutboundCall()` so `opening_script`, `first_message`, and `system_prompt` stay aligned with the payload.

6. **`generateCallBrief()`** now fills `referenceNumbers` from `extractedFields` when `patientContext` is null.

## Agent setup in ElevenLabs

- **First message:** `{{opening_script}}` or `{{first_message}}`
- **System / instructions:** `{{system_prompt}}` **or** a static prompt that tells the agent to read `{{reference_numbers_summary}}` and the individual ID variables.

Redeploy the **ElevenLabs payload** (Rebuild in the Action Center) after analysis or after editing missing fields so the latest IDs are included.

## Files touched

- `lib/integrations/elevenlabs.ts` — merge logic, prompts, dynamic variables
- `app/api/outreach/elevenlabs/call/route.ts` — uses `mergeDynamicVariablesForOutboundCall`, logs variable keys
- `lib/agents/call-brief.ts` — `referenceNumbers` fallback from `extractedFields`
