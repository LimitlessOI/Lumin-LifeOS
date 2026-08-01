/**
 * SYNOPSIS: Generates a unique API key for a partner, differentiating it from platform keys.
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';

// module.exports = { generatePartnerKey }

export async function generatePartnerKey(deps, payload) {
  const { pool, logger } = deps;
  const { partner_id } = payload || {}; // Assuming payload contains partner_id
  if (!partner_id) {
    logger.warn('generatePartnerKey called without partner_id in payload');
    throw new Error('Partner ID is required to generate a partner key.');
  }

  try {
    // Generate a secure random API key
    const apiKey = crypto.randomBytes(32).toString('hex');
    // Prepend a distinguishing prefix for partner keys
    const fullApiKey = `partner-${partner_id}-${apiKey}`;

    // In a real scenario, you'd likely store this key in a new table,
    // for example, `partner_api_keys` with columns like `partner_id`, `api_key`, `created_at`, `expires_at`.
    // Since no such table is provided in LIVE DB SCHEMA, we'll return the key directly.
    // If a table were available, the pattern would be:
    /*
    await pool.query(
      'INSERT INTO partner_api_keys (partner_id, api_key) VALUES ($1, $2) RETURNING *',
      [partner_id, fullApiKey]
    );
    */

    // For now, just return the generated key as per the original intent to define partner API key schema
    // and the constraint of not inventing DB tables.
    return { api_key: fullApiKey, partner_id: partner_id };

  } catch (error) {
    logger.error({ error, partner_id }, 'Error in generatePartnerKey');
    throw new Error('Failed to generate partner key.');
  }
}
