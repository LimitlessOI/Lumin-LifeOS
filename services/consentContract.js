/**
 * SYNOPSIS: Formalizes consent and likeness contract model.
 * @ssot docs/products/creator-media-os/PRODUCT_HOME.md
 */
export async function formalizeConsentContract(deps, payload) {
  const { pool, logger } = deps;
  const { userId, feature, consentText, ipAddress, sessionId } = payload || {}; // Renamed from 'id' to reflect relevant columns

  if (!userId || !feature || !consentText || !ipAddress || !sessionId) {
    logger.warn({ payload }, 'Incomplete payload for formalizeConsentContract');
    throw new Error('Incomplete contract details provided.');
  }

  try {
    // Consent contract model
    const { rows } = await pool.query(
      `INSERT INTO marketing_consent_records (user_id, consent_type, source, consented_at, ip_address, session_id, consent_text)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6)
       RETURNING id, user_id, consent_type, source, consented_at, ip_address, session_id, consent_text`,
      [userId, feature, 'LifeOS_Platform', ipAddress, sessionId, consentText]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, payload }, 'Error in formalizeConsentContract');
    throw new Error('Failed to formalize consent contract');
  }
}