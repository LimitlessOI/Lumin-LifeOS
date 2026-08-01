/**
 * SYNOPSIS: Generates API keys for partners and the platform.
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
import crypto from 'crypto';

export async function generatePartnerKeys(deps, payload) {
  const { pool, logger } = deps;
  const { partnerId } = payload || {};

  if (!partnerId) {
    throw new Error('Partner ID is required to generate partner keys.');
  }

  const apiKey = crypto.randomBytes(32).toString('hex');
  const apiSecret = crypto.randomBytes(64).toString('hex'); // Generate a secret for HMAC or similar

  try {
    // Assuming a table exists or needs to be created for storing partner API keys
    // For now, let's just return them. If a DB table is needed, it would be `partner_api_keys`
    // with columns like `partner_id`, `api_key`, `api_secret`, `created_at`, `is_active`.
    // Since no such table is in the LIVE DB SCHEMA, we'll return the generated keys.
    logger.info({ partnerId }, 'Generated partner API keys.');
    return { partnerId, apiKey, apiSecret };
  } catch (error) {
    logger.error({ error, partnerId }, 'Error in generatePartnerKeys');
    throw new Error('Failed to generate partner keys.');
  }
}

export async function generatePlatformKeys(deps, payload) {
  const { pool, logger } = deps;
  const { clientId } = payload || {}; // Assuming platform keys might be tied to a client configuration

  if (!clientId) {
    throw new Error('Client ID is required to generate platform keys.');
  }

  const platformKey = crypto.randomBytes(32).toString('hex');
  const platformSecret = crypto.randomBytes(64).toString('hex'); // Generate a secret for HMAC or similar

  try {
    // Similar to partner keys, if a specific DB table for platform keys is needed, it would be `platform_api_keys`
    // with columns like `client_id`, `platform_key`, `platform_secret`, `created_at`, `is_active`.
    // Since no such table is in the LIVE DB SCHEMA, we'll return the generated keys.
    logger.info({ clientId }, 'Generated platform API keys.');
    return { clientId, platformKey, platformSecret };
  } catch (error) {
    logger.error({ error, clientId }, 'Error in generatePlatformKeys');
    throw new Error('Failed to generate platform keys.');
  }
}

// Backward-compatible alias for queued blueprint expectation (white-label-step3).
export const generatePartnerKey = generatePartnerKeys;