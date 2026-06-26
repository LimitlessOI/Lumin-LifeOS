/**
 * SYNOPSIS: Define valid statuses for sessions and content packs
 */
import { URL } from 'url'; // Standard Node.js URL module for link validation

// Define valid statuses for sessions and content packs
const VALID_SESSION_STATUSES = new Set(['draft', 'scheduled', 'publishing', 'published', 'failed']);
const VALID_DELIVERY_STATUSES = new Set(['pending', 'in_progress', 'completed', 'failed']);
const VALID_CONTENT_PACK_STATUSES = new Set(['draft', 'ready', 'published', 'archived']);

export function createMarketingOSFactory({ pool, logger }) {

  // Helper to ensure ownerId is present
  function ensureOwnerId(ownerId) {
    if (!ownerId) {
      const err = new Error('owner_id_required');
      err.status = 401; // Unauthorized, as per auth pattern
      throw err;
    }
  }

  // --- Session Management ---

  async function createSession({ ownerId, scheduledFor, initialStatus = 'draft' }) {
    ensureOwnerId(ownerId);
    if (!VALID_SESSION_STATUSES.has(initialStatus)) {
      const err = new Error('invalid_initial_session_status');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `INSERT INTO socialmediaos_sessions
         (owner_id, status, scheduled_for)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [ownerId, initialStatus, scheduledFor || null]
    );
    logger.info(`MarketingOS session created: ${rows[0].id} for owner ${ownerId}`);
    return rows[0];
  }

  async function getSession({ sessionId, ownerId }) {
    ensureOwnerId(ownerId);
    const { rows } = await pool.query(
      `SELECT * FROM socialmediaos_sessions WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [sessionId, ownerId]
    );
    if (!rows[0]) {
      const err = new Error('session_not_found');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  async function updateSession({ sessionId, ownerId, status, scheduledFor, startedAt, completedAt, deliveryStatus, deliveryErrorMessage }) {
    ensureOwnerId(ownerId);
    const currentSession = await getSession({ sessionId, ownerId }); // Ensures session exists and belongs to owner

    const updates = [];
    const params = [sessionId, ownerId];
    let paramIndex = 3; // $1 is sessionId, $2 is ownerId, $3 is updated_at

    if (status !== undefined) {
      if (!VALID_SESSION_STATUSES.has(status)) {
        const err = new Error('invalid_session_status');
        err.status = 400;
        throw err;
      }
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (scheduledFor !== undefined) {
      updates.push(`scheduled_for = $${paramIndex++}`);
      params.push(scheduledFor);
    }
    if (startedAt !== undefined) {
      updates.push(`started_at = $${paramIndex++}`);
      params.push(startedAt);
    }
    if (completedAt !== undefined) {
      updates.push(`completed_at = $${paramIndex++}`);
      params.push(completedAt);
    }
    if (deliveryStatus !== undefined) {
      if (!VALID_DELIVERY_STATUSES.has(deliveryStatus)) {
        const err = new Error('invalid_delivery_status');
        err.status = 400;
        throw err;
      }
      updates.push(`delivery_status = $${paramIndex++}`);
      params.push(deliveryStatus);
    }
    if (deliveryErrorMessage !== undefined) {
      updates.push(`delivery_error_message = $${paramIndex++}`);
      params.push(deliveryErrorMessage);
    }

    if (updates.length === 0) {
      return currentSession; // No updates requested
    }

    const { rows } = await pool.query(
      `UPDATE socialmediaos_sessions
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND owner_id = $2
       RETURNING *`,
      params
    );
    logger.info(`MarketingOS session updated: ${sessionId} for owner ${ownerId}`);
    return rows[0];
  }

  async function listSessions({ ownerId, status, limit = 50 }) {
    ensureOwnerId(ownerId);
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    let query = `SELECT * FROM socialmediaos_sessions WHERE owner_id = $1`;
    const params = [ownerId];
    let paramIndex = 2;

    if (status) {
      if (!VALID_SESSION_STATUSES.has(status)) {
        const err = new Error('invalid_session_status_filter');
        err.status = 400;
        throw err;
      }
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
    params.push(lim);

    const { rows } = await pool.query(query, params);
    return rows;
  }

  // --- Content Pack Management ---

  async function createContentPack({ sessionId, ownerId, scheduledFor, initialStatus = 'draft' }) {
    ensureOwnerId(ownerId);
    if (!VALID_CONTENT_PACK_STATUSES.has(initialStatus)) {
      const err = new Error('invalid_initial_content_pack_status');
      err.status = 400;
      throw err;
    }

    // Verify session exists and belongs to owner
    await getSession({ sessionId, ownerId });

    const { rows } = await pool.query(
      `INSERT INTO socialmediaos_content_packs
         (session_id, owner_id, status, scheduled_for)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sessionId, ownerId, initialStatus, scheduledFor || null]
    );
    logger.info(`MarketingOS content pack created: ${rows[0].id} for session ${sessionId}`);
    return rows[0];
  }

  async function getContentPack({ contentPackId, ownerId }) {
    ensureOwnerId(ownerId);
    const { rows } = await pool.query(
      `SELECT * FROM socialmediaos_content_packs WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [contentPackId, ownerId]
    );
    if (!rows[0]) {
      const err = new Error('content_pack_not_found');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  async function updateContentPack({ contentPackId, ownerId, status, scheduledFor, publishedAt, deliveryStatus, deliveryErrorMessage }) {
    ensureOwnerId(ownerId);
    const currentContentPack = await getContentPack({ contentPackId, ownerId }); // Ensures pack exists and belongs to owner

    const updates = [];
    const params = [contentPackId, ownerId];
    let paramIndex = 3;

    if (status !== undefined) {
      if (!VALID_CONTENT_PACK_STATUSES.has(status)) {
        const err = new Error('invalid_content_pack_status');
        err.status = 400;
        throw err;
      }
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (scheduledFor !== undefined) {
      updates.push(`scheduled_for = $${paramIndex++}`);
      params.push(scheduledFor);
    }
    if (publishedAt !== undefined) {
      updates.push(`published_at = $${paramIndex++}`);
      params.push(publishedAt);
    }
    if (deliveryStatus !== undefined) {
      if (!VALID_DELIVERY_STATUSES.has(deliveryStatus)) {
        const err = new Error('invalid_delivery_status');
        err.status = 400;
        throw err;
      }
      updates.push(`delivery_status = $${paramIndex++}`);
      params.push(deliveryStatus);
    }
    if (deliveryErrorMessage !== undefined) {
      updates.push(`delivery_error_message = $${paramIndex++}`);
      params.push(deliveryErrorMessage);
    }

    if (updates.length === 0) {
      return currentContentPack; // No updates requested
    }

    const { rows } = await pool.query(
      `UPDATE socialmediaos_content_packs
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND owner_id = $2
       RETURNING *`,
      params
    );
    logger.info(`MarketingOS content pack updated: ${contentPackId} for owner ${ownerId}`);
    return rows[0];
  }

  async function listContentPacksForSession({ sessionId, ownerId, status, limit = 50 }) {
    ensureOwnerId(ownerId);
    // Verify session exists and belongs to owner
    await getSession({ sessionId, ownerId });

    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    let query = `SELECT * FROM socialmediaos_content_packs WHERE session_id = $1 AND owner_id = $2`;
    const params = [sessionId, ownerId];
    let paramIndex = 3;

    if (status) {
      if (!VALID_CONTENT_PACK_STATUSES.has(status)) {
        const err = new Error('invalid_content_pack_status_filter');
        err.status = 400;
        throw err;
      }
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
    params.push(lim);

    const { rows } = await pool.query(query, params);
    return rows;
  }

  // --- Stripe Payment Link Validation ---

  function validateStripePaymentLink({ link }) {
    if (!link || typeof link !== 'string') {
      return { valid: false, reason: 'link_must_be_a_string' };
    }

    try {
      const url = new URL(link);
      if (!url.protocol.startsWith('http')) {
        return { valid: false, reason: 'link_must_be_http_or_https' };
      }
      // Basic check for Stripe domain. This is a heuristic, not a guarantee.
      // Real validation would involve Stripe API calls, which are forbidden here.
      if (!url.hostname.includes('stripe.com')) {
        return { valid: false, reason: 'link_must_be_a_stripe_domain' };
      }
      // Further checks could be added here if specific Stripe link patterns are known
      // e.g., /pay/, /checkout/, etc. For now, just domain.

      return { valid: true, reason: null };
    } catch (e) {
      return { valid: false, reason: 'invalid_url_format' };
    }
  }

  return {
    // Session Management
    createSession,
    getSession,
    updateSession,
    listSessions,

    // Content Pack Management
    createContentPack,
    getContentPack,
    updateContentPack,
    listContentPacksForSession,

    // Payment Link Validation
    validateStripePaymentLink,
  };
}