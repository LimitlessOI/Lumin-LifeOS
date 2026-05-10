import crypto from 'crypto';
import { URL } from 'url';

/**
 * Creates a service for validating incoming webhooks from various providers.
 * @param {object} deps - Dependencies.
 * @param {object} deps.logger - Logger instance.
 * @returns {object} Webhook validation service.
 */
export function createTCWebhookValidationService({ logger = console }) {

  /**
   * Validates a Postmark webhook request using the EMAIL_WEBHOOK_SECRET.
   * Postmark sends a custom header 'X-Email-Webhook-Secret' with the configured secret.
   * @param {object} req - The Express request object.
   * @returns {{valid: boolean, error: string|null}} Validation result.
   */
  function validatePostmarkWebhook(req) {
    const secret = process.env.EMAIL_WEBHOOK_SECRET;
    if (!secret) {
      logger.warn('[WEBHOOK-VALIDATION] Postmark: EMAIL_WEBHOOK_SECRET not configured.');
      return { valid: false, error: 'Webhook secret not configured.' };
    }

    const providedSecret = req.headers['x-email-webhook-secret'];
    if (!providedSecret) {
      logger.warn('[WEBHOOK-VALIDATION] Postmark: Missing X-Email-Webhook-Secret header.');
      return { valid: false, error: 'Missing signature header.' };
    }

    if (providedSecret !== secret) {
      logger.warn('[WEBHOOK-VALIDATION] Postmark: Invalid X-Email-Webhook-Secret header.');
      return { valid: false, error: 'Invalid signature.' };
    }

    return { valid: true, error: null };
  }

  /**
   * Validates a Twilio webhook request using the TWILIO_AUTH_TOKEN and X-Twilio-Signature header.
   * This implementation assumes `req.body` is already parsed by `express.urlencoded`.
   * For strict Twilio validation, the raw request body string is typically required.
   * @param {object} req - The Express request object.
   * @returns {{valid: boolean, error: string|null}} Validation result.
   */
  function validateTwilioWebhook(req) {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      logger.warn('[WEBHOOK-VALIDATION] Twilio: TWILIO_AUTH_TOKEN not configured.');
      return { valid: false, error: 'Webhook secret not configured.' };
    }

    const twilioSignature = req.headers['x-twilio-signature'];
    if (!twilioSignature) {
      logger.warn('[WEBHOOK-VALIDATION] Twilio: Missing X-Twilio-Signature header.');
      return { valid: false, error: 'Missing signature header.' };
    }

    // Reconstruct the full URL, including protocol and host
    const requestUrl = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`).href;

    // Twilio validation requires parameters to be sorted alphabetically.
    // For POST requests, parameters are from the request body.
    const params = req.body || {};
    const sortedKeys = Object.keys(params).sort();

    let data = requestUrl;
    for (const key of sortedKeys) {
      data += key + params[key];
    }

    const expectedSignature = crypto.createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    if (expectedSignature !== twilioSignature) {
      logger.warn('[WEBHOOK-VALIDATION] Twilio: Invalid X-Twilio-Signature header.');
      return { valid: false, error: 'Invalid signature.' };
    }

    return { valid: true, error: null };
  }

  return {
    validatePostmarkWebhook,
    validateTwilioWebhook,
  };
}