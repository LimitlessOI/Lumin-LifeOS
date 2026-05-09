import crypto from 'crypto';
import { URLSearchParams } from 'url';

/**
 * Validates a Postmark webhook request signature.
 * Postmark uses HMAC-SHA256 with EMAIL_WEBHOOK_SECRET.
 * @param {object} req - The Express request object. Must have req.rawBody (populated by middleware).
 * @returns {{valid: boolean, payload: object|null, error: string|null}}
 */
export function validatePostmarkWebhook(req) {
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!secret) {
    return { valid: false, payload: null, error: 'EMAIL_WEBHOOK_SECRET not configured' };
  }

  const signature = req.headers['x-postmark-signature'];