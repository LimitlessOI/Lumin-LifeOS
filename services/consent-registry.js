/**
 * services/consent-registry.js
 *
 * Tracks explicit consent for each data-using LifeOS feature.
 * Append-only — never updates or deletes rows.
 * Refuses to activate features without valid current consent.
 *
 * Exports:
 *   createConsentRegistry({ pool }) → ConsentRegistry
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

/** All features that require explicit consent before activation */
const FEATURES = [
  'wearable_data',
  'conversation_analysis',
  'health_patterns',
  'purpose_synthesis',
  'fulfillment',
  'research_aggregate',
  'family_sharing',
  'tone_analysis',
];

export function createConsentRegistry({ pool }) {

  /**
   * Record a consent grant for a feature.
   * Inserts a new 'granted' row — never updates existing rows.
   *
   * @param {object} p
   * @param {number|string} p.userId
   * @param {string} p.feature
   * @param {string} [p.consentText]   Exact language shown to user at time of consent
   * @param {string} [p.ipNote]        General location note (not precise IP)
   * @returns {Promise<object>} The inserted row
   */
  async function grantConsent({ userId, feature, consentText, ipNote }) {
    if (!FEATURES.includes(feature)) {
      throw new Error(`Unknown feature: "${feature}". Valid features: ${FEATURES.join(', ')}`);
    }
    const uid = parseInt(userId, 10);
    const { rows } = await pool.query(`
      INSERT INTO consent_registry (user_id, feature, action, consent_text, ip_note)
      VALUES ($1, $2, 'granted', $3, $4)
      RETURNING *
    `, [uid, feature, consentText || null, ipNote || null]);
    return rows[0];
  }

  /**
   * Record a consent revocation for a feature.
   * Inserts a new 'revoked' row — never updates existing rows.
   *
   * @param {object} p
   * @param {number|string} p.userId
   * @param {string} p.feature
   * @param {string} [p.reason]
   * @returns {Promise<object>} The inserted row
   */
  async function revokeConsent({ userId, feature, reason }) {
    if (!FEATURES.includes(feature)) {
      throw new Error(`Unknown feature: "${feature}". Valid features: ${FEATURES.join(', ')}`);
    }
    const uid = parseInt(userId, 10);
    const { rows } = await pool.query(`
      INSERT INTO consent_registry (user_id, feature, action, revocation_reason)
      VALUES ($1, $2, 'revoked', $3)
      RETURNING *
    `, [uid, feature, reason || null]);
    return rows[0];
  }

  /**
   * Check if the most recent consent action for a feature is 'granted'.
   *
   * @param {number|string} userId
   * @param {string} feature
   * @returns {Promise<boolean>}
   */
  async function hasConsent(userId, feature) {
    const uid = parseInt(userId, 10);
    const { rows } = await pool.query(`
      SELECT action
      FROM consent_registry
      WHERE user_id = $1 AND feature = $2
      ORDER BY consented_at DESC
      LIMIT 1
    `, [uid, feature]);
    if (rows.length === 0) return false;
    return rows[0].action === 'granted';
  }

  /**
   * Assert consent — throws if the user has not granted consent for this feature.
   * Use this as a gate before activating any consent-gated feature.
   *
   * @param {number|string} userId
   * @param {string} feature
   * @throws {Error} if consent is not granted
   */
  async function requireConsent(userId, feature) {
    const granted = await hasConsent(userId, feature);
    if (!granted) {
      throw new Error(`Consent required for ${feature}`);
    }
  }

  /**
   * Get the current consent state for all features for a user.
   *
   * @param {number|string} userId
   * @returns {Promise<Record<string, 'granted'|'revoked'|'not_set'>>}
   */
  async function getConsentState(userId) {
    const uid = parseInt(userId, 10);
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (feature)
        feature,
        action
      FROM consent_registry
      WHERE user_id = $1
      ORDER BY feature, consented_at DESC
    `, [uid]);

    // Build a result for ALL known features, defaulting to 'not_set'
    const result = {};
    for (const f of FEATURES) {
      result[f] = 'not_set';
    }
    for (const row of rows) {
      result[row.feature] = row.action;
    }
    return result;
  }

  /**
   * Get the full consent history for a user+feature, most recent first.
   *
   * @param {number|string} userId
   * @param {string} feature
   * @returns {Promise<Array>}
   */
  async function getHistory(userId, feature) {
    const uid = parseInt(userId, 10);
    const { rows } = await pool.query(`
      SELECT *
      FROM consent_registry
      WHERE user_id = $1 AND feature = $2
      ORDER BY consented_at DESC
    `, [uid, feature]);
    return rows;
  }

  return {
    FEATURES,
    grantConsent,
    revokeConsent,
    hasConsent,
    requireConsent,
    getConsentState,
    getHistory,
  };
}
