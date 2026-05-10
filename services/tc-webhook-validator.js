import crypto from 'crypto';

/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-communication-callback-service.js
 * Normalizes delivery/reply callbacks into canonical TC communication state.
 */
function normalizeProviderEvent(provider, payload = {}) {
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
    external_id: payload.external_id || payload.externalId || payload.MessageSid || payload.Sid || null,
    feedback_text: payload.feedback_text || payload.feedbackText || payload.Body || payload.body || null,
    from: payload.from || payload.From || null,
    to: payload.to || payload.To || null,
    raw: payload,
  };
}

/**
 * Validates a Postmark webhook request signature.
 * Postmark uses HMAC-SHA256 of the raw request body, signed with EMAIL_WEBHOOK_SECRET.
 * The signature is in the 'X-Postmark-Signature' header, e.g., 'algorithm=sha256,signature=HEX_SIGNATURE'.
 * Assumes rawBody is available on the request object (e.g., via express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })).
 * @param {import('express').Request} req The Express request object.
 * @returns {{valid: boolean, payload: object|null, error: string|null}}
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

  const signatureMatch = signatureHeader.match(/signature=([0-9a-fA-F]+)/);
  if (!signatureMatch || !signatureMatch[1]) {
    return { valid: false, payload: null, error: 'Invalid X-Postmark-Signature header format' };
  }
  const providedSignature = signatureMatch[1];

  if (!req.rawBody) {
    return { valid: false, payload: null, error: 'Raw request body not available for signature validation. Ensure middleware captures raw body.' };
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(req.rawBody);
  const calculatedSignature = hmac.digest('hex');

  if (calculatedSignature !== providedSignature) {
    return { valid: false, payload: null, error: 'Invalid Postmark webhook signature' };
  }

  return { valid: true, payload: req.body, error: null };
}

/**
 * Validates a Twilio webhook request signature.
 * Twilio uses HMAC-SHA1 of the request URL + sorted request parameters, signed with TWILIO_AUTH_TOKEN.
 * The signature is in the 'X-Twilio-Signature' header.
 * @param {import('express').Request} req The Express request object.
 * @returns {{valid: boolean, payload: object|null, error: string|null}}
 */
export function validateTwilioWebhook(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_WEBHOOK_SECRET || process.env.EMAIL_WEBHOOK_SECRET;
  if (!authToken) {
    return { valid: false, payload: null, error: 'TWILIO_AUTH_TOKEN or TWILIO_WEBHOOK_SECRET not configured' };
  }

  const twilioSignature = req.headers['x-twilio-signature'];
  if (!twilioSignature) {
    return { valid: false, payload: null, error: 'Missing X-Twilio-Signature header' };
  }

  const requestUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

  // For POST requests, Twilio signs the URL-encoded body parameters.
  // For GET requests, it signs the query parameters.
  const params = req.method === 'POST' ? req.body : req.query;

  const sortedKeys = Object.keys(params).sort();
  let data = requestUrl;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const hmac = crypto.createHmac('sha1', authToken);
  hmac.update(data);
  const calculatedSignature = hmac.digest('base64');

  if (calculatedSignature !== twilioSignature) {
    return { valid: false, payload: null, error: 'Invalid Twilio webhook signature' };
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

    const normalized = normalizeProviderEvent(payload.provider, payload);

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
      if (feedbackText && feedbackText.length > 3) { // Basic check for meaningful feedback
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

    return { ok: true, communication: updated, callback: normalized, feedback, };
  }

  async function handleProviderWebhook(payload = {}) {
    const externalId = payload.external_id || payload.externalId || payload.MessageID || payload.MessageSid || payload.Sid || null;
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
  };
}

export const createTCCommunicationCallbackService;