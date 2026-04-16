/**
 * services/multi-person-sync.js
 *
 * Multi-person household sync for LifeOS.
 * Allows two people (e.g. Adam and Sherry) to link accounts and share
 * explicitly opted-in data with each other.
 *
 * SOVEREIGNTY RULE: accounts are NEVER merged. Each person retains full
 * independent control. Shared data only exists in explicitly opted-in
 * "shared spaces." No feature is shared by default.
 *
 * Exports:
 *   createMultiPersonSync({ pool, logger }) → MultiPersonSync
 *
 * DB tables used (created by lifeos_family migration):
 *   lifeos_account_links           — bidirectional account link records
 *   lifeos_shared_feature_consent  — per-feature sharing consent records
 *   lifeos_joy_scores              — source for joy_score shared view
 *   lifeos_integrity_scores        — source for integrity_score shared view
 *   lifeos_commitments             — source for commitments shared view
 *   lifeos_calendar_rules          — source for calendar_rules shared view
 *   lifeos_health_summaries        — source for health_summary shared view
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

/** Features that users are allowed to share with a linked partner. */
const SHAREABLE_FEATURES = [
  'joy_score',
  'integrity_score',
  'commitments',
  'calendar_rules',
  'health_summary',
];

/**
 * @param {object} opts
 * @param {import('pg').Pool} opts.pool
 * @param {object}            [opts.logger]
 * @returns {MultiPersonSync}
 */
export function createMultiPersonSync({ pool, logger = console }) {

  // ---------------------------------------------------------------------------
  // Account linking
  // ---------------------------------------------------------------------------

  /**
   * Initiate an account link request.
   * The partner (partnerUserId) must call acceptLink() before the link becomes
   * active. No party is force-linked.
   *
   * @param {object}        p
   * @param {number|string} p.userId          User initiating the link
   * @param {number|string} p.partnerUserId   User being invited
   * @param {string}        [p.linkType]      Relationship label (default: 'partner')
   * @returns {Promise<object>} The pending link record
   */
  async function linkAccounts({ userId, partnerUserId, linkType = 'partner' }) {
    const uid = parseInt(userId, 10);
    const pid = parseInt(partnerUserId, 10);

    if (uid === pid) {
      throw new Error('Cannot link an account to itself.');
    }

    // Guard: reject if an active link already exists in either direction
    const { rows: existing } = await pool.query(`
      SELECT id
      FROM lifeos_account_links
      WHERE status = 'active'
        AND (
          (user_id = $1 AND partner_user_id = $2)
          OR (user_id = $2 AND partner_user_id = $1)
        )
    `, [uid, pid]);

    if (existing.length > 0) {
      throw new Error(
        `An active link already exists between users ${uid} and ${pid}.`
      );
    }

    const { rows } = await pool.query(`
      INSERT INTO lifeos_account_links
        (user_id, partner_user_id, link_type, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `, [uid, pid, linkType]);

    logger.info(
      { linkId: rows[0].id, userId: uid, partnerId: pid, linkType },
      'multi-person-sync: link request created'
    );

    return rows[0];
  }

  /**
   * Accept a pending link.
   * Only the intended partner (partner_user_id on the record) may accept.
   *
   * @param {object}        p
   * @param {number|string} p.linkId           ID of the pending link record
   * @param {number|string} p.acceptingUserId  Must match partner_user_id
   * @returns {Promise<object>} The updated (now active) link record
   */
  async function acceptLink({ linkId, acceptingUserId }) {
    const lid = parseInt(linkId, 10);
    const auid = parseInt(acceptingUserId, 10);

    const { rows: found } = await pool.query(`
      SELECT * FROM lifeos_account_links WHERE id = $1
    `, [lid]);

    if (found.length === 0) {
      throw new Error(`Link ${lid} not found.`);
    }

    const link = found[0];

    if (link.partner_user_id !== auid) {
      throw new Error(
        `User ${auid} is not the intended partner for link ${lid}. ` +
        `Only user ${link.partner_user_id} may accept this link.`
      );
    }

    if (link.status === 'active') {
      throw new Error(`Link ${lid} is already active.`);
    }

    if (link.status === 'revoked') {
      throw new Error(`Link ${lid} has been revoked and cannot be accepted.`);
    }

    const { rows } = await pool.query(`
      UPDATE lifeos_account_links
      SET status = 'active', accepted_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [lid]);

    logger.info(
      { linkId: lid, acceptingUserId: auid },
      'multi-person-sync: link accepted'
    );

    return rows[0];
  }

  /**
   * Revoke an active or pending link.
   * Either party (user_id or partner_user_id) may revoke at any time.
   * All shared feature consents between these two users are also removed.
   *
   * @param {object}        p
   * @param {number|string} p.linkId            ID of the link record
   * @param {number|string} p.requestingUserId  Must be user_id or partner_user_id
   * @returns {Promise<object>} The revoked link record
   */
  async function revokeLink({ linkId, requestingUserId }) {
    const lid = parseInt(linkId, 10);
    const ruid = parseInt(requestingUserId, 10);

    const { rows: found } = await pool.query(`
      SELECT * FROM lifeos_account_links WHERE id = $1
    `, [lid]);

    if (found.length === 0) {
      throw new Error(`Link ${lid} not found.`);
    }

    const link = found[0];

    if (link.user_id !== ruid && link.partner_user_id !== ruid) {
      throw new Error(
        `User ${ruid} is not a party to link ${lid} and cannot revoke it.`
      );
    }

    // Idempotent — return already-revoked record as-is
    if (link.status === 'revoked') {
      return link;
    }

    const { rows } = await pool.query(`
      UPDATE lifeos_account_links
      SET status = 'revoked', revoked_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [lid]);

    // Cascade: remove all feature-sharing consent between these two users in
    // both directions, since the link no longer exists.
    await pool.query(`
      DELETE FROM lifeos_shared_feature_consent
      WHERE (user_id = $1 AND partner_user_id = $2)
         OR (user_id = $2 AND partner_user_id = $1)
    `, [link.user_id, link.partner_user_id]);

    logger.info(
      { linkId: lid, requestingUserId: ruid },
      'multi-person-sync: link revoked'
    );

    return rows[0];
  }

  /**
   * Get all active links for a user (as either initiator or partner).
   *
   * @param {number|string} userId
   * @returns {Promise<Array>}
   */
  async function getLinks(userId) {
    const uid = parseInt(userId, 10);
    const { rows } = await pool.query(`
      SELECT *
      FROM lifeos_account_links
      WHERE status = 'active'
        AND (user_id = $1 OR partner_user_id = $1)
      ORDER BY accepted_at DESC
    `, [uid]);
    return rows;
  }

  // ---------------------------------------------------------------------------
  // Feature sharing consent
  // ---------------------------------------------------------------------------

  /**
   * Share a specific feature's data with a linked partner.
   * Only features listed in SHAREABLE_FEATURES are allowed.
   * An active link must exist between the two users.
   *
   * @param {object}        p
   * @param {number|string} p.userId         User sharing their own data
   * @param {number|string} p.partnerUserId  Partner who will be able to view it
   * @param {string}        p.feature        One of SHAREABLE_FEATURES
   * @returns {Promise<{ ok: boolean, feature: string, sharedWith: number }>}
   */
  async function shareFeatureWith({ userId, partnerUserId, feature }) {
    if (!SHAREABLE_FEATURES.includes(feature)) {
      throw new Error(
        `"${feature}" is not shareable. ` +
        `Shareable features: ${SHAREABLE_FEATURES.join(', ')}`
      );
    }

    const uid = parseInt(userId, 10);
    const pid = parseInt(partnerUserId, 10);

    // Require an active link between these two users before sharing is allowed
    const { rows: links } = await pool.query(`
      SELECT id
      FROM lifeos_account_links
      WHERE status = 'active'
        AND (
          (user_id = $1 AND partner_user_id = $2)
          OR (user_id = $2 AND partner_user_id = $1)
        )
      LIMIT 1
    `, [uid, pid]);

    if (links.length === 0) {
      throw new Error(
        `No active link exists between users ${uid} and ${pid}. ` +
        `Both users must have an accepted link before sharing features.`
      );
    }

    // Upsert — if this feature is already shared, this is a no-op
    await pool.query(`
      INSERT INTO lifeos_shared_feature_consent (user_id, partner_user_id, feature)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, partner_user_id, feature) DO NOTHING
    `, [uid, pid, feature]);

    logger.info(
      { userId: uid, partnerUserId: pid, feature },
      'multi-person-sync: feature shared'
    );

    return { ok: true, feature, sharedWith: pid };
  }

  /**
   * Revoke sharing of a specific feature with a partner.
   *
   * @param {object}        p
   * @param {number|string} p.userId
   * @param {number|string} p.partnerUserId
   * @param {string}        p.feature
   * @returns {Promise<{ ok: boolean, feature: string, revokedFrom: number }>}
   */
  async function revokeSharedFeature({ userId, partnerUserId, feature }) {
    if (!SHAREABLE_FEATURES.includes(feature)) {
      throw new Error(
        `"${feature}" is not a shareable feature. ` +
        `Valid: ${SHAREABLE_FEATURES.join(', ')}`
      );
    }

    const uid = parseInt(userId, 10);
    const pid = parseInt(partnerUserId, 10);

    await pool.query(`
      DELETE FROM lifeos_shared_feature_consent
      WHERE user_id = $1 AND partner_user_id = $2 AND feature = $3
    `, [uid, pid, feature]);

    logger.info(
      { userId: uid, partnerUserId: pid, feature },
      'multi-person-sync: feature share revoked'
    );

    return { ok: true, feature, revokedFrom: pid };
  }

  // ---------------------------------------------------------------------------
  // Shared view
  // ---------------------------------------------------------------------------

  /**
   * Return only the data that targetUserId has explicitly shared with
   * requestingUserId. Features not shared are returned as null — this function
   * never exposes data the target has not opted into sharing.
   *
   * @param {object}        p
   * @param {number|string} p.requestingUserId  Person asking to see data
   * @param {number|string} p.targetUserId      Person whose data may be visible
   * @returns {Promise<{
   *   joy:           object|null,
   *   integrity:     object|null,
   *   commitments:   Array|null,
   *   calendarRules: Array|null,
   *   healthSummary: object|null,
   * }>}
   */
  async function getSharedView({ requestingUserId, targetUserId }) {
    const reqUid = parseInt(requestingUserId, 10);
    const tgtUid = parseInt(targetUserId, 10);

    // Fetch which features targetUserId has shared with requestingUserId
    const { rows: consents } = await pool.query(`
      SELECT feature
      FROM lifeos_shared_feature_consent
      WHERE user_id = $1 AND partner_user_id = $2
    `, [tgtUid, reqUid]);

    const sharedFeatures = new Set(consents.map(r => r.feature));

    const result = {
      joy: null,
      integrity: null,
      commitments: null,
      calendarRules: null,
      healthSummary: null,
    };

    if (sharedFeatures.has('joy_score')) {
      const { rows } = await pool.query(`
        SELECT score, note, recorded_at
        FROM lifeos_joy_scores
        WHERE user_id = $1
        ORDER BY recorded_at DESC
        LIMIT 1
      `, [tgtUid]);
      result.joy = rows[0] || null;
    }

    if (sharedFeatures.has('integrity_score')) {
      const { rows } = await pool.query(`
        SELECT score, streak_days, last_calculated_at
        FROM lifeos_integrity_scores
        WHERE user_id = $1
        ORDER BY last_calculated_at DESC
        LIMIT 1
      `, [tgtUid]);
      result.integrity = rows[0] || null;
    }

    if (sharedFeatures.has('commitments')) {
      const { rows } = await pool.query(`
        SELECT id, title, status, due_date, created_at
        FROM lifeos_commitments
        WHERE user_id = $1
          AND status NOT IN ('deleted', 'archived')
        ORDER BY due_date ASC NULLS LAST
      `, [tgtUid]);
      result.commitments = rows;
    }

    if (sharedFeatures.has('calendar_rules')) {
      const { rows } = await pool.query(`
        SELECT id, rule_type, rule_text, active, created_at
        FROM lifeos_calendar_rules
        WHERE user_id = $1 AND active = true
        ORDER BY created_at DESC
      `, [tgtUid]);
      result.calendarRules = rows;
    }

    if (sharedFeatures.has('health_summary')) {
      const { rows } = await pool.query(`
        SELECT summary_type, summary_json, recorded_at
        FROM lifeos_health_summaries
        WHERE user_id = $1
        ORDER BY recorded_at DESC
        LIMIT 1
      `, [tgtUid]);
      result.healthSummary = rows[0] || null;
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    SHAREABLE_FEATURES,
    // Account linking
    linkAccounts,
    acceptLink,
    revokeLink,
    getLinks,
    // Feature sharing
    shareFeatureWith,
    revokeSharedFeature,
    // Shared view
    getSharedView,
  };
}
