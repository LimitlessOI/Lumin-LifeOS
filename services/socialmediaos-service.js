/**
 * SYNOPSIS: SocialMediaOS / MarketingOS content-pack session and checkout service.
 * @ssot docs/products/marketingos/socialmediaos/PRODUCT_HOME.md
 */
import { URL } from 'url'; // Standard Node.js URL module for link validation
import { getStripeClient } from './stripe-client.js';
import { SMOS_PRICING } from '../config/smos-pricing.js';

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

  // --- Content Pack Stripe Checkout ---

  async function createContentPackCheckout({ ownerId, baseUrl, sessionId, packId }) {
    ensureOwnerId(ownerId);
    const amountCents = SMOS_PRICING.pack.oneTimeCents;
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      const err = new Error('invalid_smos_pricing');
      err.status = 500;
      throw err;
    }
    const safeBase = String(baseUrl || '').replace(/\/+$/, '');
    if (!safeBase) {
      const err = new Error('base_url_required');
      err.status = 500;
      throw err;
    }
    const stripe = await getStripeClient();
    if (!stripe) {
      const err = new Error('stripe_not_configured');
      err.status = 503;
      throw err;
    }

    let pack = null;
    let linkedSessionId = sessionId || null;

    if (packId) {
      pack = await getContentPack({ contentPackId: packId, ownerId });
      linkedSessionId = pack.session_id || linkedSessionId;
    } else if (sessionId) {
      await getSession({ sessionId, ownerId });
      pack = await createContentPack({ sessionId, ownerId });
    } else {
      const session = await createSession({ ownerId, initialStatus: 'draft' });
      linkedSessionId = session.id;
      pack = await createContentPack({ sessionId: session.id, ownerId });
    }

    const successUrl = `${safeBase}/api/v1/socialmediaos/content-pack/success?contentPackId=${encodeURIComponent(pack.id)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${safeBase}/api/v1/socialmediaos/content-pack/cancel?contentPackId=${encodeURIComponent(pack.id)}`;

    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: SMOS_PRICING.pack.name,
              description: SMOS_PRICING.pack.description,
            },
            unit_amount: Math.round(amountCents),
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product: 'smos-content-pack',
        ownerId: String(ownerId),
        contentPackId: String(pack.id),
        sessionId: String(linkedSessionId || ''),
      },
    });

    logger.info(`SMOS content pack checkout created: ${pack.id} for owner ${ownerId}`);
    return {
      ok: true,
      contentPackId: pack.id,
      sessionId: linkedSessionId,
      checkoutUrl: checkout.url,
      checkoutSessionId: checkout.id,
      amountCents,
    };
  }

  async function verifyContentPackCheckout({ checkoutSessionId, contentPackId, ownerId }) {
    const stripe = await getStripeClient();
    if (!stripe) {
      const err = new Error('stripe_not_configured');
      err.status = 503;
      throw err;
    }

    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    const paid = session.payment_status === 'paid';

    if (paid && contentPackId) {
      let resolvedOwnerId = ownerId;
      if (!resolvedOwnerId) {
        const { rows } = await pool.query(
          'SELECT owner_id FROM socialmediaos_content_packs WHERE id = $1 LIMIT 1',
          [contentPackId]
        );
        resolvedOwnerId = rows[0]?.owner_id || null;
      }
      if (resolvedOwnerId) {
        await updateContentPack({ contentPackId, ownerId: resolvedOwnerId, status: 'ready' });
      } else {
        await pool.query(
          "UPDATE socialmediaos_content_packs SET status = 'ready', updated_at = NOW() WHERE id = $1",
          [contentPackId]
        );
      }
    }

    return { ok: paid, paid, amountCents: session.amount_total, checkoutSessionId, contentPackId, paymentStatus: session.payment_status };
  }

  function getContentPackPricing() {
    return {
      ok: true,
      contentPackCents: SMOS_PRICING.pack.oneTimeCents,
      contentPackDollars: (SMOS_PRICING.pack.oneTimeCents / 100).toFixed(2),
    };
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

    // Content Pack Checkout
    createContentPackCheckout,
    verifyContentPackCheckout,
    getContentPackPricing,

    // Payment Link Validation
    validateStripePaymentLink,
  };
}