import crypto from 'crypto';

// @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
// tc-communication-callback-service.js
// Normalizes delivery/reply callbacks into canonical TC communication state. */

/**
 * Normalizes a provider's webhook event payload into a canonical TC communication event.
 * This function serves as both `normalizeDeliveryCallback` and `normalizeShowingFeedbackReply`.
 * @param {string} provider - The name of the webhook provider ('postmark', 'twilio', etc.).
 * @param {object} payload - The raw payload received from the webhook.
 * @returns {{provider: string, event_type: string, status: string, external_id: string|null, feedback_text: string|null, from: string|null, to