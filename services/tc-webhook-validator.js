/**
 * SYNOPSIS: services/tc-webhook-validator.js
 * services/tc-webhook-validator.js
 * Validates inbound webhook signatures from Postmark (email events) and Twilio (SMS events).
 * Exports createTCWebhookValidator({ secret, logger }) → { validatePostmark, validateTwilio }.
 *
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import crypto from 'crypto';

export function createTCWebhookValidator({ postmarkSecret = '', twilioAuthToken = '', logger = console } = {}) {
  function safeCompare(left, right) {
    const leftBuf = Buffer.from(String(left || ''));
    const rightBuf = Buffer.from(String(right || ''));
    if (!leftBuf.length || !rightBuf.length || leftBuf.length !== rightBuf.length) return false;
    return crypto.timingSafeEqual(leftBuf, rightBuf);
  }

  function validatePostmark(req) {
    const signature = req.headers['x-postmark-signature'] || '';
    if (!postmarkSecret) return { ok: true, skip: true, reason: 'POSTMARK_WEBHOOK_SECRET not configured' };
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha256', postmarkSecret).update(body).digest('base64');
    const ok = safeCompare(signature, expected);
    if (!ok) logger.warn?.('[TC-WEBHOOK-VALIDATOR] Postmark signature mismatch');
    return { ok, provider: 'postmark' };
  }

  function validateTwilio(req) {
    const signature = req.headers['x-twilio-signature'] || '';
    if (!twilioAuthToken) return { ok: true, skip: true, reason: 'TWILIO_AUTH_TOKEN not configured' };
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const params = req.body || {};
    const sorted = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], url);
    const expected = crypto.createHmac('sha1', twilioAuthToken).update(sorted).digest('base64');
    const ok = safeCompare(signature, expected);
    if (!ok) logger.warn?.('[TC-WEBHOOK-VALIDATOR] Twilio signature mismatch');
    return { ok, provider: 'twilio' };
  }

  return { validatePostmark, validateTwilio };
}
