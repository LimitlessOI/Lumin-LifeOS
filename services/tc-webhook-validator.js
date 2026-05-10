import crypto from 'crypto';
// @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
// tc-communication-callback-service.js
// Normalizes delivery/reply callbacks into canonical TC communication state. */

/**
 * Normalizes a provider's webhook event payload into a canonical TC communication event.
 * @param {string} provider - The name of the webhook provider ('postmark', 'twilio', etc.).
 * @param {object} payload - The raw payload received from the webhook.
 * @returns {{provider: string, event_type: string, status: string, external_id: string|null, feedback_text: string|null, from: string|null, to: string|null, raw: object}}
 */
function normalizeProviderEvent(provider, payload = {}) {
  const p = String(provider || 'manual').toLowerCase();
  const event = String(
    payload.event_type || payload.eventType || payload.status || payload.MessageStatus || payload.SmsStatus || payload.EmailEvent || 'delivered'
  ).toLowerCase();
  let status = 'sent';
  if (['queued', 'accepted', 'scheduled', 'sending'].includes(event)) status = 'prepared';
  else if (['sent', 'delivered', 'success'].includes(event)) status = 'sent';
  else if (['opened', 'read', 'seen'].includes(event)) status = '