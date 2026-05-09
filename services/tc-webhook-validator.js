import crypto from 'crypto';
import { URLSearchParams } from 'url';

/**
 * Validates a Postmark webhook request signature.
 * Postmark uses HMAC-SHA256 with the `EMAIL_WEBHOOK_SECRET` as the key.
 * The signature is provided in the `X-Postmark-Signature` header and is an HMAC of the raw request body.
 *
 * IMPORTANT: This function requires `req.rawBody` to be populated by a middleware (e.g., `express.raw()` or a custom body parser)
 * before this validation function is called. If `req.rawBody` is not available, validation will fail.
 *
 * @param {object} req - The Express request object. Must have `req.rawBody` (Buffer) and `req.headers`.
 * @returns {{valid: boolean, payload: object|null, error: string|null}}
 */
export function validatePostmarkWebhook(req) {
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!secret) {
    return { valid: false, payload: null, error: 'EMAIL_WEBHOOK_SECRET not configured' };
  }

  const signature = req.headers['x-postmark-signature'];
  if (!signature) {
    return { valid: false, payload: null, error: 'Missing X-Postmark-Signature header' };
  }

  // req.rawBody must be populated by a preceding middleware (e.g., express.raw())
  if (!req.rawBody) {
    return { valid: false, payload: null, error: 'Raw body not available for Postmark signature validation. Ensure middleware populates req.rawBody.' };
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(req.rawBody);
  const expectedSignature = hmac.digest('base64');

  if (expectedSignature !== signature) {
    return { valid: false, payload: null, error: 'Invalid Postmark signature' };
  }

  return { valid: true, payload: req.body, error: null };
}

/**
 * Validates a Twilio webhook request signature.
 * Twilio uses HMAC-SHA1 with the `TWILIO_AUTH_TOKEN` (or `TWILIO_WEBHOOK_SECRET`) as the key.
 * The signature is provided in the `X-Twilio-Signature` header.
 * The signature is an HMAC of the request URL (including query parameters) concatenated with
 * the sorted POST body parameters.
 *
 * @param {object} req - The Express request object. Must have `req.protocol`, `req.get('host')`, `req.originalUrl`, and `req.body` (parsed form data).
 * @returns {{valid: boolean, payload: object|null, error: string|null}}
 */
export function validateTwilioWebhook(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_WEBHOOK_SECRET; // TWILIO_AUTH_TOKEN is standard
  if (!authToken) {
    return { valid: false, payload: null, error: 'TWILIO_AUTH_TOKEN or TWILIO_WEBHOOK_SECRET not configured' };
  }

  const signature = req.headers['x-twilio-signature'];
  if (!signature) {
    return { valid: false, payload: null, error: 'Missing X-Twilio-Signature header' };
  }

  // Construct the base string for signature validation
  // 1. Full request URL (protocol + host + originalUrl including query)
  let url = req.protocol + '://' + req.get('host') + req.originalUrl;

  // 2. Sorted POST body parameters
  const params = req.body || {};
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += params[key];
  }

  const hmac = crypto.createHmac('sha1', authToken);
  hmac.update(data);
  const expectedSignature = hmac.digest('base64');

  if (expectedSignature !== signature) {
    return { valid: false, payload: null, error: 'Invalid Twilio signature' };
  }

  return { valid: true, payload: req.body, error: null };
}