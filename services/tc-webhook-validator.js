import crypto from 'crypto';
import { validateRequest as twilioValidateRequest } from 'twilio/lib/webhooks/webhooks';

/**
 * Normalizes delivery/reply callbacks into canonical TC communication state.
 * This function is exported as `normalizeDeliveryCallback`.
 * @param {string} provider - The name of the provider ('postmark' | 'twilio' | 'manual').
 * @param {object} payload - The raw payload from the webhook.
 * @returns {{provider: string, event_type: string, status: string, external_id: string|null, feedback_text: string|null, from: string|null, to: string|null, raw: object}} Normalized event.
 */
export function normalizeDeliveryCallback(provider, payload = {}) {
  const p = String(provider || 'manual').toLowerCase();
  const event = String(
    payload.event_type || payload.eventType || payload.status || payload.MessageStatus || payload.SmsStatus || payload.EmailEvent || 'delivered'
  ).toLowerCase();

  let status = 'sent';
  if (['queued', 'accepted', 'scheduled', 'sending'].includes(event)) status = 'prepared';
  else if (['sent', 'delivered', 'success'].includes(event)) status = 'sent';
  else if (['opened', 'read', 'seen'].includes(event)) status = 'delivered';
  else if (['replied', 'reply', 'inbound_reply', 'response_received'].includes(event)) status = 'replied';
  else if (['failed', 'undelivered', 'bounced', 'error'].includes(event)) status = 'failed';

  return {
    provider: p,
    event_type: event,
    status,
    external_id: payload.external_id || payload.externalId || payload.MessageID || payload.MessageId || payload.MessageSid || payload.SmsSid || payload.Sid || null,
    feedback_text: payload.feedback_text || payload.feedbackText || payload.Body || payload.body || null,
    from: payload.from || payload.From || null,
    to: payload.to || payload.To || null,
    raw: payload,
  };
}

/**
 * Extracts and normalizes showing feedback from a webhook payload.
 * @param {string} provider - The name of the provider ('postmark' | 'twilio').
 * @param {object} payload - The raw payload from the webhook.
 * @returns {{raw_feedback: string|null, source: string}} Normalized feedback.
 */
export function normalizeShowingFeedbackReply(provider, payload = {}) {
  const feedbackText = String(payload.feedback_text || payload.feedbackText || payload.Body || payload.body || '').trim();
  return {
    raw_feedback: feedbackText || null,
    source: `${String(provider || 'manual').toLowerCase()}_callback`,
  };
}

/**
 * Validates a Postmark webhook request signature.
 * @param {object} req - The Express request object.
 * @returns {{valid: boolean, payload: object|null, error: string|null}} Validation result.
 */
export function validatePostmarkWebhook(req) {
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!secret) {
    return { valid: false, payload: null, error: 'EMAIL_WEBHOOK_SECRET not configured' };
  }

  const signatureHeader = req.headers['x-postmark-signature'];
  if (!signatureHeader) {
    return { valid: false, payload: null, error: 'Missing X-Postmark-Signature header' };
  }

  const parts = signatureHeader.split(',');
  let timestamp = '';
  let signature = '';

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') {
      timestamp = value;
    } else if (key === 's') {
      signature = value;
    }
  }

  if (!timestamp || !signature) {
    return { valid: false, payload: null, error: 'Invalid X-Postmark-Signature header format' };
  }

  // Postmark signs the timestamp + raw body
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(timestamp);
  hmac.update(req.rawBody || JSON.stringify(req.body)); // Use rawBody if available, otherwise stringify parsed body

  const expectedSignature = hmac.digest('base64');

  if (expectedSignature !== signature) {
    return { valid: false, payload: null, error: 'Invalid Postmark signature' };
  }

  return { valid: true, payload: req.body, error: null };
}

/**
 * Validates a Twilio webhook request signature.
 * @param {object} req - The Express request object.
 * @returns {{valid: boolean, payload: object|null, error: string|null}} Validation result.
 */
export function validateTwilioWebhook(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_WEBHOOK_SECRET; // TWILIO_WEBHOOK_SECRET is also a valid alias
  if (!authToken) {
    return { valid: false, payload: null, error: 'TWILIO_AUTH_TOKEN or TWILIO_WEBHOOK_SECRET not configured' };
  }

  const twilioSignature = req.headers['x-twilio-signature'];
  if (!twilioSignature) {
    return { valid: false, payload: null, error: 'Missing X-Twilio-Signature header' };
  }

  // Twilio's validation function expects the full URL, the request body (as an object), and the signature.
  // It also needs the auth token.
  const requestUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  const params = req.body; // For Twilio, the parsed body is used for validation

  try {
    const isValid = twilioValidateRequest(authToken, twilioSignature, requestUrl, params);
    if (!isValid) {
      return { valid: false, payload: null, error: 'Invalid Twilio signature' };
    }
  } catch (error) {
    return { valid: false, payload: null, error: `Twilio validation error: ${error.message}` };
  }

  return { valid: true, payload: req.body, error: null };
}

export function createTCCommunicationCallbackService({ pool, portalService, reportService, coordinator, logger = console }) {
  async function getCommunication(communicationId) {
    const { rows } = await pool.query(`SELECT * FROM tc_communications WHERE id=$1`, [communicationId]);
    return rows[0] || null;
  }

  async function getCommunicationByExternalId(externalId) {
    if (!externalId) return null;
    const { rows } = await pool.query(
      `SELECT * FROM tc_communications
       WHERE metadata->>'external_id' = $1
          OR metadata->'delivery'->>'messageId' = $1
          OR metadata->'delivery'->>'sid' = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [String(externalId)]
    );
    return rows[0] || null;
  }

  async function handleCallback(communicationId, payload = {}) {
    const communication = await getCommunication(communicationId);
    if (!communication) return { ok: false, error: 'Communication not found' };

    const normalized = normalizeDeliveryCallback(payload.provider, payload);

    const metadata = {
      ...(communication.metadata || {}),
      last_callback: {
        provider: normalized.provider,
        event_type: normalized.event_type,
        external_id: normalized.external_id,
        at: new Date().toISOString(),
      },
      callback_history: [
        ...((communication.metadata || {}).callback_history || []),
        {
          provider: normalized.provider,
          event_type: normalized.event_type,
          status: normalized.status,
          external_id: normalized.external_id,
          feedback_text: normalized.feedback_text,
          at: new Date().toISOString(),
        },
      ].slice(-20), // Keep last 20 callbacks
    };

    const updated = await portalService.updateCommunication(communicationId, {
      status: normalized.status,
      sent_at: communication.sent_at || (normalized.status === 'sent' ? new Date().toISOString() : communication.sent_at),
      metadata,
    });

    await coordinator.logEvent(communication.transaction_id, 'communication_callback', {
      communication_id: communicationId,
      provider: normalized.provider,
      event_type: normalized.event_type,
      status: normalized.status,
      external_id: normalized.external_id,
    });

    let feedback = null;
    if (normalized.feedback_text && communication.metadata?.showing_id) {
      const feedbackText = String(normalized.feedback_text).trim();
      if (feedbackText && feedbackText.length > 3) { // Minimum length for meaningful feedback
        try {
          feedback = await reportService.recordShowingFeedback(communication.metadata.showing_id, {
            raw_feedback: feedbackText,
            source: `${normalized.provider}_callback`,
          });
          await coordinator.logEvent(communication.transaction_id, 'showing_feedback_received', {
            communication_id: communicationId,
            showing_id: communication.metadata.showing_id,
            source: `${normalized.provider}_callback`,
          });
        } catch (error) {
          logger.warn?.({ err: error.message, communicationId }, '[TC-COMM-CALLBACK] feedback persistence failed');
        }
      }
    }

    return { ok: true, communication: updated, callback: normalized, feedback };
  }

  async function handleProviderWebhook(payload = {}) {
    const externalId = payload.external_id || payload.externalId || payload.MessageID || payload.MessageId || payload.MessageSid || payload.SmsSid || payload.Sid || null;
    const communicationId = payload.communication_id || payload.communicationId || payload.Metadata?.communication_id || payload.metadata?.communication_id || null;

    let communication = null;
    if (communicationId) communication = await getCommunication(Number(communicationId));
    if (!communication && externalId) communication = await getCommunicationByExternalId(externalId);

    if (!communication) return { ok: false, error: 'Communication not found for webhook' };

    return handleCallback(communication.id, payload);
  }

  return {
    handleCallback,
    handleProviderWebhook,
    validatePostmarkWebhook, // Exported for use in routes
    validateTwilioWebhook,   // Exported for use in routes
    normalizeDeliveryCallback, // Already exported, but good to list here for clarity
    normalizeShowingFeedbackReply, // Exported for use in routes
  };
}

export default createTCCommunicationCallbackService;