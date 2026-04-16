/**
 * services/fulfillment-engine.js
 *
 * Consent-gated reorder service.
 * Observes patterns, surfaces suggestions, places orders on explicit approval.
 *
 * CONSTITUTIONAL RULE: No brand pays for placement.
 * Suggestions come from observed need only.
 *
 * Exports: createFulfillmentEngine({ pool })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createFulfillmentEngine({ pool }) {
  // ── proposeFulfillment ───────────────────────────────────────────────────────
  /**
   * Create a 'proposed' order — never executes automatically.
   * The user must explicitly approve before anything is ordered.
   */
  async function proposeFulfillment({
    userId,
    productName,
    productUrl,
    reason,
    estimatedPrice,
    affiliateSource,
    affiliateFeeEstimate,
  }) {
    const { rows } = await pool.query(
      `INSERT INTO fulfillment_orders
         (user_id, product_name, product_url, reason,
          estimated_price, affiliate_source, affiliate_fee_estimate,
          status, consent_given)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'proposed', FALSE)
       RETURNING *`,
      [
        userId,
        productName,
        productUrl       || null,
        reason,
        estimatedPrice   || null,
        affiliateSource  || null,
        affiliateFeeEstimate || null,
      ]
    );
    return rows[0];
  }

  // ── approveOrder ─────────────────────────────────────────────────────────────
  /**
   * User gives explicit consent. Sets status='approved', consent_given=true.
   * This is the only path to moving beyond 'proposed'.
   */
  async function approveOrder(orderId) {
    const { rows } = await pool.query(
      `UPDATE fulfillment_orders
          SET status       = 'approved',
              consent_given = TRUE,
              approved_at  = NOW()
        WHERE id = $1
        RETURNING *`,
      [orderId]
    );
    const order = rows[0];
    if (!order) throw new Error(`Fulfillment order ${orderId} not found`);
    return order;
  }

  // ── cancelOrder ──────────────────────────────────────────────────────────────
  async function cancelOrder(orderId) {
    const { rows } = await pool.query(
      `UPDATE fulfillment_orders
          SET status = 'cancelled'
        WHERE id = $1
        RETURNING *`,
      [orderId]
    );
    const order = rows[0];
    if (!order) throw new Error(`Fulfillment order ${orderId} not found`);
    return order;
  }

  // ── markOrdered ──────────────────────────────────────────────────────────────
  async function markOrdered(orderId, confirmationText) {
    const { rows } = await pool.query(
      `UPDATE fulfillment_orders
          SET status             = 'ordered',
              ordered_at         = NOW(),
              order_confirmation = $2
        WHERE id = $1
        RETURNING *`,
      [orderId, confirmationText || null]
    );
    const order = rows[0];
    if (!order) throw new Error(`Fulfillment order ${orderId} not found`);
    return order;
  }

  // ── getOrders ────────────────────────────────────────────────────────────────
  async function getOrders(userId, { status = null } = {}) {
    if (status) {
      const { rows } = await pool.query(
        `SELECT * FROM fulfillment_orders
          WHERE user_id = $1 AND status = $2
          ORDER BY proposed_at DESC`,
        [userId, status]
      );
      return rows;
    }
    const { rows } = await pool.query(
      `SELECT * FROM fulfillment_orders
        WHERE user_id = $1
        ORDER BY proposed_at DESC`,
      [userId]
    );
    return rows;
  }

  // ── getPendingProposals ───────────────────────────────────────────────────────
  async function getPendingProposals(userId) {
    return getOrders(userId, { status: 'proposed' });
  }

  return {
    proposeFulfillment,
    approveOrder,
    cancelOrder,
    markOrdered,
    getOrders,
    getPendingProposals,
  };
}
