import crypto from 'crypto';
import { validateRequest as twilioValidateRequest } from 'twilio/lib/webhooks/webhooks';

/**
 * Normalizes delivery/reply callbacks into canonical TC communication state.
 * This function is exported as `normalizeDeliveryCallback`.
 * @param {string} provider - The name of the provider ('postmark' | 'twilio' | 'manual').
 * @param {object} payload - The raw payload from the webhook.
 * @returns {{provider: string, event_type: string, status: string, external_id: string|null, feedback_text: string|null, from: string|null, to: string|null, raw: object}} Normalized event.
 */
function normalizeDeliveryCallback(provider, payload = {}) {
  const p = String(