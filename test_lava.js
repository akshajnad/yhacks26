const https = require('https');

const data = JSON.stringify({
  agent_id: process.env.ELEVENLABS_AGENT_ID || "agent_4501kmwj9ha4f3kaethmn39hk6y2",
  agent_phone_number_id: process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID || "phnum_2601kmwhkemde2rsz9mwr6t03wky",
  to_number: "+18605938988",
  customer_phone_number: "+18605938988",
  first_message: "Hi test"
});

const req = https.request("https://api.lava.so/v1/forward/https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + (process.env.LAVA_FORWARD_TOKEN || ""),
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.write(data);
req.end();
