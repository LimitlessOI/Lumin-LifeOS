/**
 * SYNOPSIS: twilio-service.js — extracted from server.js
 * twilio-service.js — extracted from server.js
 * Phone call / SMS helpers via Twilio.
 *
 * Use createTwilioService(deps) to get bound functions.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

/**
 * @param {object} deps
 * @param {function} deps.callCouncilMember
 * @param {string}   deps.RAILWAY_PUBLIC_DOMAIN
 * @param {string}   deps.ALERT_PHONE
 * @param {object}   deps.alertState  — mutable object with .inProgress boolean
 */
export function createTwilioService(deps) {
  const {
    callCouncilMember,
    RAILWAY_PUBLIC_DOMAIN,
    ALERT_PHONE,
    alertState,
  } = deps;

  let twilioClient = null;

  // --------------------------------------------------------------------------
  // getTwilioClient
  // --------------------------------------------------------------------------
  async function getTwilioClient() {
    // GAP-FILL, 2026-08-04: neither value was ever .trim()'d here, unlike
    // e.g. CEREBRAS_API_KEY elsewhere in this codebase. This repo already
    // hit exactly this bug class once, during the robust-magic-production ->
    // lumin-web-production Railway migration: PUBLIC_BASE_URL carried a
    // leading space + a dead robust-magic host into multiple scripts until
    // someone added .trim() (see docs/CONTINUITY_LOG.md). Confirmed live:
    // the second-factor SMS gate shipped this session (commit 2176f7d4a)
    // fails every send with a bare "Authenticate" error from Twilio despite
    // the founder confirming these exact credentials have worked, unchanged,
    // since before that migration -- untrimmed whitespace picked up
    // somewhere in that same event is the leading real hypothesis, not a
    // revoked/wrong credential.
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    if (!accountSid || !authToken) {
      return null;
    }
    if (twilioClient) return twilioClient;
    try {
      // Lazy load Twilio to avoid breaking if not installed
      const twilioModule = await import('twilio');
      const Twilio = twilioModule.default || twilioModule;
      twilioClient = new Twilio(accountSid, authToken);
      return twilioClient;
    } catch (err) {
      console.warn(`Twilio not available: ${err.message}`);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // makePhoneCall
  // --------------------------------------------------------------------------
  async function makePhoneCall(to, from, message, aiMember = "chatgpt") {
    try {
      const client = await getTwilioClient();
      if (!client) {
        throw new Error("Twilio not configured");
      }

      // Use AI to generate call script
      const callScript = await callCouncilMember(
        aiMember,
        `Generate a brief, natural phone call script for this message: ${message}. Keep it conversational and under 30 seconds.`
      );

      // Make the call (Twilio API)
      const call = await client.calls.create({
        to: String(to || '').trim(),
        from: String(from || process.env.TWILIO_PHONE_NUMBER || '').trim(),
        url: `${RAILWAY_PUBLIC_DOMAIN || 'http://localhost:8080'}/api/v1/phone/call-handler`,
        method: 'POST',
      });

      return { success: true, callSid: call.sid, script: callScript };
    } catch (error) {
      console.error(`Phone call error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // --------------------------------------------------------------------------
  // sendSMS
  // --------------------------------------------------------------------------
  async function sendSMS(to, message, aiMember = "chatgpt") {
    try {
      const client = await getTwilioClient();
      if (!client) {
        throw new Error("Twilio not configured");
      }

      // Optionally use AI to optimize message
      const optimizedMessage = message.length > 160
        ? await callCouncilMember(aiMember, `Condense this to under 160 chars: ${message}`)
        : message;

      const sms = await client.messages.create({
        to: String(to || '').trim(),
        from: String(process.env.TWILIO_PHONE_NUMBER || '').trim(),
        body: optimizedMessage,
      });

      return { success: true, messageSid: sms.sid };
    } catch (error) {
      console.error(`SMS error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // --------------------------------------------------------------------------
  // sendAlertSms
  // --------------------------------------------------------------------------
  async function sendAlertSms(message) {
    try {
      if (!ALERT_PHONE || !process.env.TWILIO_PHONE_NUMBER) return;
      await sendSMS(ALERT_PHONE, message, "chatgpt");
      console.log("📱 [ALERT] SMS sent");
    } catch (err) {
      console.warn("⚠️ Alert SMS failed:", err.message);
    }
  }

  // --------------------------------------------------------------------------
  // sendAlertCall
  // --------------------------------------------------------------------------
  async function sendAlertCall(message) {
    try {
      if (!ALERT_PHONE || !process.env.TWILIO_PHONE_NUMBER) return;
      const client = await getTwilioClient();
      if (!client) return;
      await client.calls.create({
        twiml: `<Response><Say voice="alice">${message}</Say></Response>`,
        to: String(ALERT_PHONE || '').trim(),
        from: String(process.env.TWILIO_PHONE_NUMBER || '').trim(),
      });
      console.log("📞 [ALERT] Call placed");
    } catch (err) {
      console.warn("⚠️ Alert call failed:", err.message);
    }
  }

  // --------------------------------------------------------------------------
  // notifyCriticalIssue
  // --------------------------------------------------------------------------
  async function notifyCriticalIssue(reason) {
    // Avoid spamming: only one alert sequence at a time
    if (alertState.inProgress) return;
    alertState.inProgress = true;

    const msg =
      `🚨 LifeOS alert: critical issue detected.\n` +
      `${reason}\n` +
      `System will continue with any available AI providers.`;

    // Send SMS immediately
    await sendAlertSms(msg);

    // Place a call after 10 minutes if still needed
    setTimeout(() => {
      sendAlertCall(msg);
    }, 10 * 60 * 1000);

    // Reset after 15 minutes to allow future alerts
    setTimeout(() => {
      alertState.inProgress = false;
    }, 15 * 60 * 1000);
  }

  return {
    getTwilioClient,
    makePhoneCall,
    sendSMS,
    sendAlertSms,
    sendAlertCall,
    notifyCriticalIssue,
  };
}
