/**
 * services/twilio-webhook-registrar.js
 *
 * Automatically registers the SMS webhook URL with Twilio at server startup.
 * No manual Twilio console action required — the system configures itself.
 *
 * What it does:
 *   1. Calls Twilio REST API to find the IncomingPhoneNumber record for TWILIO_PHONE_NUMBER
 *   2. Patches its SmsUrl to point at our Railway domain + /api/v1/autonomy/sms-webhook
 *   3. Logs success or failure — never throws (startup must not break if Twilio is down)
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID   — Twilio account identifier
 *   TWILIO_AUTH_TOKEN    — Twilio auth secret
 *   TWILIO_PHONE_NUMBER  — The phone number to configure (e.g. +17025551234)
 *   RAILWAY_PUBLIC_DOMAIN — Your app's public URL (e.g. https://lifeos.up.railway.app)
 *
 * Exports: registerTwilioWebhook() → Promise<{ registered, url, error? }>
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

/**
 * Register (or update) the Twilio SMS webhook for TWILIO_PHONE_NUMBER.
 * Idempotent — safe to call on every startup. Only patches if URL changed.
 */
export async function registerTwilioWebhook() {
  const accountSid  = process.env.TWILIO_ACCOUNT_SID;
  const authToken   = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const domain      = process.env.RAILWAY_PUBLIC_DOMAIN;

  if (!accountSid || !authToken || !phoneNumber) {
    return { registered: false, error: 'Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER' };
  }

  if (!domain) {
    return { registered: false, error: 'Missing RAILWAY_PUBLIC_DOMAIN — cannot build webhook URL' };
  }

  const webhookUrl = `${domain}/api/v1/autonomy/sms-webhook`;
  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    // Step 1: Find the IncomingPhoneNumber SID for our phone number
    const listUrl = `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json`
      + `?PhoneNumber=${encodeURIComponent(phoneNumber)}`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(10000),
    });

    if (!listRes.ok) {
      const body = await listRes.text();
      return { registered: false, error: `Twilio list error ${listRes.status}: ${body}` };
    }

    const listData = await listRes.json();
    const numbers = listData.incoming_phone_numbers || [];

    if (numbers.length === 0) {
      return { registered: false, error: `Phone number ${phoneNumber} not found in Twilio account` };
    }

    const numberSid = numbers[0].sid;
    const currentSmsUrl = numbers[0].sms_url;

    // Step 2: Skip if already set to the correct URL
    if (currentSmsUrl === webhookUrl) {
      console.log(`[TWILIO] SMS webhook already set correctly: ${webhookUrl}`);
      return { registered: true, url: webhookUrl, changed: false };
    }

    // Step 3: Patch the SmsUrl
    const patchUrl = `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers/${numberSid}.json`;
    const body = new URLSearchParams({
      SmsUrl:    webhookUrl,
      SmsMethod: 'POST',
    });

    const patchRes = await fetch(patchUrl, {
      method: 'POST', // Twilio REST uses POST for updates
      headers: {
        Authorization:  authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!patchRes.ok) {
      const errBody = await patchRes.text();
      return { registered: false, error: `Twilio patch error ${patchRes.status}: ${errBody}` };
    }

    console.log(`✅ [TWILIO] SMS webhook registered: ${webhookUrl} (was: ${currentSmsUrl || 'unset'})`);
    return { registered: true, url: webhookUrl, changed: true };

  } catch (err) {
    return { registered: false, error: err.message };
  }
}
