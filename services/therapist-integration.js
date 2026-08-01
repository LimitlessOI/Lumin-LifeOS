/**
 * SYNOPSIS: Sets up the therapist integration, wiring communication and truth delivery profiles.
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
import { createCommunicationProfile } from './communication-profile.js';
import { createTruthDelivery } from './truth-delivery.js';

/**
 * Sets up the therapist integration.
 * @param {object} deps - Injected dependencies (pool, logger, callAI, etc.).
 * @param {object} payload - The payload for the integration setup. Expected to contain `userId` and `therapistId`.
 */
export async function setupIntegration(deps, payload) {
  const { pool, logger, callAI } = deps;
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

    // Wire communication-profile.js and truth-delivery.js: instantiate both
    // factories against this request's deps and fetch/create the client's
    // communication profile so the integration has real context to work
    // with. truth-delivery is instantiated (available for the therapist's
    // own later, explicit use) but NOT auto-invoked here — generating an
    // unsolicited "hard truth" message as a side effect of setup would be
    // exactly the kind of unrequested push the User Sovereignty rule
    // (no dark patterns, no steering without the user asking) forbids.
    const communicationProfile = createCommunicationProfile({ pool, callAI, logger });
    const truthDelivery = createTruthDelivery({ pool, callAI });
    const profile = await communicationProfile.getOrCreate(userId);

    // Log successful setup
    logger.info({ userId, therapistId }, 'Therapist integration setup successfully.');

    // Mark the integration as active
    await pool.query(
      'INSERT INTO user_integrations (user_id, provider, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id, provider) DO UPDATE SET updated_at = NOW() RETURNING id',
      [userId, 'therapist_integration']
    );

    return {
      success: true,
      message: 'Therapist integration established.',
      therapistProfile,
      communicationProfile: profile,
      truthDeliveryAvailable: typeof truthDelivery.generate === 'function',
    };
  } catch (error) {
    logger.error({ error, userId, therapistId }, 'Error in setupIntegration for therapist');
    throw new Error(`Failed to set up therapist integration: ${error.message}`);
  }
}
