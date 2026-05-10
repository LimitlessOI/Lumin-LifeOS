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
  function validatePostmarkWebhook(req)