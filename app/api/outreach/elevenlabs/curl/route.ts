import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { mergeDynamicVariablesForOutboundCall } from "@/lib/integrations/elevenlabs";
import type { ElevenLabsCallPayload } from "@/types/outreach";

export async function POST(req: NextRequest) {
  let body: { payload?: ElevenLabsCallPayload } = {};
  try {
    body = await req.json();
  } catch {
    // Ignore invalid JSON
  }
  
  const payload = body.payload;
  if (!payload) {
    return NextResponse.json({ error: "Missing required field: payload" }, { status: 400 });
  }

  // Parse patient/provider number or fallback
  const rawNumber = payload.recipient.toNumber;
  const digits = rawNumber?.replace(/\D/g, "") || "";
  let toNumber = "+18605938988"; 
  if (digits.length === 10) toNumber = `+1${digits}`;
  else if (digits.length === 11 && digits.startsWith("1")) toNumber = `+${digits}`;
  else if (digits.length > 7) toNumber = `+${digits}`;

  // Generate dynamic variables exactly like the original route does
  const baseVars = mergeDynamicVariablesForOutboundCall(payload);

  // Construct the exact json body the user requested, but inject dynamic extracted info
  const requestBody = {
    agent_id: "agent_4501kmwj9ha4f3kaethmn39hk6y2",
    agent_phone_number_id: "phnum_2601kmwhkemde2rsz9mwr6t03wky",
    to_number: toNumber,
    conversation_initiation_client_data: {
      custom_llm_extra_body: {},
      user_id: `medbill-${payload.caseId.slice(0, 8)}`,
      source_info: {},
      branch_id: "",
      environment: "",
      dynamic_variables: baseVars
    },
    call_recording_enabled: false,
    telephony_call_config: {}
  };

  return new Promise((resolve) => {
    // Safe stringification for curl -d ''
    const jsonStr = JSON.stringify(requestBody);
    const safeJsonStr = jsonStr.replace(/'/g, "'\\''");

    const curlCommand = `curl -s -X POST \\
  "https://api.elevenlabs.io/v1/convai/twilio/outbound-call" \\
  -H "Content-Type: application/json" \\
  -H "xi-api-key: sk_f181173838d41ea071720e2f99f474510c6b689577482ffc" \\
  -d '${safeJsonStr}'`;

    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return resolve(NextResponse.json({ error: error.message, stderr }, { status: 500 }));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(NextResponse.json({ ...parsed, toNumber, conversationId: parsed.conversation_id }));
      } catch {
        resolve(NextResponse.json({ raw: stdout, toNumber }));
      }
    });
  });
}
