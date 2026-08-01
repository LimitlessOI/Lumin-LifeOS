/**
 * SYNOPSIS: Sets up the therapist integration, wiring communication and truth delivery profiles.
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
import { getCommunicationProfile } from './communication-profile.js';
import { deliverTruth } from './truth-delivery.js';

/**
 * Sets up the therapist integration.
 * @param {object} deps - Injected dependencies (pool, logger, etc.).
 * @param {object} payload - The payload for the integration setup. Expected to contain `userId` and `therapistId`.
 */
export async function setupIntegration(deps, payload) {
  const { pool, logger } = deps;
  const { userId, therapistId } = payload || {};

  if (!userId || !therapistId) {
    logger.warn({ payload }, 'Missing userId or therapistId in setupIntegration payload');
    throw new Error('Missing required payload parameters: userId and therapistId');
  }

  try {
    // Check if the client-therapist link exists and is consented
    const { rows: linkRows } = await pool.query(
      'SELECT * FROM therapist_client_links WHERE client_user_id = $1 AND therapist_user_id = $2 AND status = $3',
      [userId, therapistId, 'consented']
    );

    if (linkRows.length === 0) {
      logger.warn({ userId, therapistId }, 'Client-therapist link not found or not consented');
      throw new Error('Therapist integration requires a consented client-therapist link.');
    }

    // Retrieve therapist profile
    const { rows: therapistProfileRows } = await pool.query(
      'SELECT * FROM therapist_profiles WHERE user_id = $1',
      [therapistId]
    );

    if (therapistProfileRows.length === 0) {
      logger.error({ therapistId }, 'Therapist profile not found');
      throw new Error('Therapist profile not found.');
    }
    const therapistProfile = therapistProfileRows[0];

    // Example of using the imported communication and truth delivery functions
    // These functions are assumed to exist and perform specific roles based on the original spec.
    const communicationProfile = await getCommunicationProfile(userId, therapistProfile);
    const truthDeliveryResult = await deliverTruth(userId, therapistProfile, communicationProfile);

    // Log successful setup or relevant details
    logger.info({ userId, therapistId, communicationProfile, truthDeliveryResult }, 'Therapist integration setup successfully.');

    // Potentially update a user_integrations table or similar to mark the integration as active
    await pool.query(
      'INSERT INTO user_integrations (user_id, provider, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id, provider) DO UPDATE SET updated_at = NOW() RETURNING id',
      [userId, 'therapist_integration']
    );

    return { success: true, message: 'Therapist integration established.' };

  } catch (error) {
    logger.error({ error, userId, therapistId }, 'Error in setupIntegration for therapist');
    throw new Error(`Failed to set up therapist integration: ${error.message}`);
  }
}