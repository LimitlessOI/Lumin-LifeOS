import crypto from 'crypto';
// @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
// tc-communication-callback-service.js
// Normalizes delivery/reply callbacks into canonical TC communication state. */

/**
 * Validates a Postmark webhook request signature.
 * @param {object} req - The Express request object. Assumes req.rawBody is available.
 * @returns {{valid: boolean, payload: object|null, error: string|null}}
 */
export function validatePostmarkWebhook(req) {
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!secret) {
    return { valid: false, payload: null, error: 'EMAIL_WEBHOOK_SECRET not configured' };
  }

  const signature