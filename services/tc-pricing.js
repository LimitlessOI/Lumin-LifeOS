/**
 * tc-pricing.js
 * TC service pricing — three billing models:
 *
 *   founding_member  — $500 one-time setup + $50/month locked forever (beta only)
 *   monthly          — $149/month, no setup fee (standard after beta closes)
 *   per_transaction  — $349/closed deal, collected at escrow, no monthly commitment
 *                      (deal falls through = no charge; risk absorbed by us)
 *
 * Agent registry: tc_agent_clients table tracks every subscribed agent,
 * their plan, billing status, and monthly revenue.
 *
 * Per-transaction fees on tc_transactions are still tracked for all plans
 * (founding/monthly agents pay the reduced/zero closing fee; per_transaction
 * agents pay the full $349 only when the deal closes).
 *
 * Exports: createTCPricing(deps)
 */

export const PLANS = {
  FOUNDING:        'founding_member',
  MONTHLY:         'monthly',
  PER_TRANSACTION: 'per_transaction',
};

export const PLAN_DETAILS = {
  [PLANS.FOUNDING]: {
    label:          'Founding Member',
    setup_fee:      500,
    monthly_fee:    50,
    closing_fee:    0,     // included in monthly — no extra per deal
    description:    'Beta rate locked forever. $500 setup + $50/month.',
    beta_only:      true,
  },
  [PLANS.MONTHLY]: {
    label:          'Monthly Standard',
    setup_fee:      0,
    monthly_fee:    149,
    closing_fee:    0,     // included in monthly
    description:    '$149/month, no setup fee. All TC services included.',
    beta_only:      false,
  },
  [PLANS.PER_TRANSACTION]: {
    label:          'Pay at Closing',
    setup_fee:      0,
    monthly_fee:    0,
    closing_fee:    349,   // per closed deal only — falls through = $0
    description:    '$349 per closed transaction, collected from escrow. No monthly fee. Deal falls through = no charge.',
    beta_only:      false,
  },
};

export function createTCPricing({ pool, logger = console }) {

  // ── Plan info ─────────────────────────────────────────────────────────────

  function getPlanDetails(plan) {
    return PLAN_DETAILS[plan] || null;
  }

  function getAllPlans() {
    return Object.entries(PLAN_DETAILS).map(([key, val]) => ({ plan: key, ...val }));
  }

  // ── Agent client registry ─────────────────────────────────────────────────

  async function createAgentClient({
    name, email, phone, plan = PLANS.MONTHLY,
    waivedSetup = false, customSetupFee, customMonthlyFee, notes,
  }) {
    const planInfo = PLAN_DETAILS[plan];
    if (!planInfo) throw new Error(`Unknown plan: ${plan}`);

    const setupFee   = waivedSetup ? 0 : (customSetupFee   ?? planInfo.setup_fee);
    const monthlyFee = customMonthlyFee ?? planInfo.monthly_fee;

    const { rows } = await pool.query(
      `INSERT INTO tc_agent_clients
         (name, email, phone, plan, setup_fee, setup_fee_waived, monthly_fee,
          setup_paid, active, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7, false, true, $8)
       ON CONFLICT (email) DO UPDATE SET
         plan           = EXCLUDED.plan,
         monthly_fee    = EXCLUDED.monthly_fee,
         notes          = EXCLUDED.notes,
         updated_at     = NOW()
       RETURNING *`,
      [name, email, phone || null, plan, setupFee, waivedSetup, monthlyFee, notes || null]
    );

    logger.info?.({ name, email, plan, setupFee, monthlyFee }, '[TC-PRICING] Agent client created');
    return rows[0];
  }

  async function getAgentClient(idOrEmail) {
    const byEmail = typeof idOrEmail === 'string' && idOrEmail.includes('@');
    const { rows } = await pool.query(
      `SELECT * FROM tc_agent_clients WHERE ${byEmail ? 'email=$1' : 'id=$1'}`,
      [idOrEmail]
    ).catch(() => ({ rows: [] }));
    return rows[0] || null;
  }

  async function listAgentClients({ activeOnly = true } = {}) {
    const { rows } = await pool.query(
      `SELECT c.*,
         COUNT(t.id)                                               AS total_transactions,
         COUNT(t.id) FILTER (WHERE t.status='closed')             AS closed_transactions,
         COALESCE(SUM(t.fee_collected_amt),0)                     AS total_collected
       FROM tc_agent_clients c
       LEFT JOIN tc_transactions t ON t.client_email = c.email
       WHERE ${activeOnly ? 'c.active = true' : '1=1'}
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  async function markSetupPaid(clientId, { amountPaid } = {}) {
    const { rows } = await pool.query(
      `UPDATE tc_agent_clients
       SET setup_paid=true, setup_paid_at=NOW(), setup_paid_amt=COALESCE($2, setup_fee)
       WHERE id=$1 RETURNING *`,
      [clientId, amountPaid || null]
    ).catch(() => ({ rows: [] }));
    logger.info?.({ clientId }, '[TC-PRICING] Setup fee marked paid');
    return rows[0] || null;
  }

  async function deactivateClient(clientId, reason = null) {
    const { rows } = await pool.query(
      `UPDATE tc_agent_clients SET active=false, notes=COALESCE($2, notes), updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [clientId, reason]
    ).catch(() => ({ rows: [] }));
    return rows[0] || null;
  }

  // ── Revenue summary ───────────────────────────────────────────────────────

  async function getRevenueSummary() {
    const [clients, txFees] = await Promise.all([
      pool.query(`
        SELECT
          plan,
          COUNT(*)                                          AS agents,
          COUNT(*) FILTER (WHERE active)                   AS active_agents,
          COALESCE(SUM(monthly_fee) FILTER (WHERE active), 0) AS mrr,
          COALESCE(SUM(setup_fee)   FILTER (WHERE setup_paid), 0) AS setup_collected,
          COALESCE(SUM(setup_fee)   FILTER (WHERE NOT setup_paid AND NOT setup_fee_waived), 0) AS setup_outstanding
        FROM tc_agent_clients
        GROUP BY plan
      `).catch(() => ({ rows: [] })),

      pool.query(`
        SELECT
          COUNT(*)                                               AS total_transactions,
          COUNT(*) FILTER (WHERE status='closed')               AS closed,
          COUNT(*) FILTER (WHERE status='closed' AND fee_collected)     AS fees_collected,
          COUNT(*) FILTER (WHERE status='closed' AND NOT fee_collected) AS fees_outstanding,
          COALESCE(SUM(fee_collected_amt), 0)                   AS total_closing_collected,
          COALESCE(SUM(closing_fee) FILTER (WHERE status='closed' AND NOT fee_collected), 0) AS closing_outstanding
        FROM tc_transactions
      `).catch(() => ({ rows: [{}] })),
    ]);

    const byPlan   = clients.rows;
    const totalMRR = byPlan.reduce((s, r) => s + Number(r.mrr), 0);
    const arr      = totalMRR * 12;

    return {
      mrr:            totalMRR,
      arr,
      byPlan,
      transactions:   txFees.rows[0] || {},
    };
  }

  // ── Per-transaction fee helpers ───────────────────────────────────────────

  /**
   * Apply the right closing fee to a transaction based on the client's plan.
   * - founding/monthly → $0 closing fee (covered by subscription)
   * - per_transaction  → $349 (or custom), collected only if deal closes
   * - unknown client   → default $200 (one-off TC work)
   */
  async function applyToTransaction(transactionId, {
    clientEmail,
    waivedSetup = false,
    customSetupFee,
    customClosingFee,
    closingFeeNote,
    clientName,
    clientPhone,
  } = {}) {
    let closingFee   = customClosingFee ?? 200;
    let setupFee     = waivedSetup ? 0 : (customSetupFee ?? 0);
    let feeNote      = closingFeeNote || null;

    if (clientEmail) {
      const client = await getAgentClient(clientEmail);
      if (client) {
        const planInfo = PLAN_DETAILS[client.plan];
        closingFee = customClosingFee ?? planInfo.closing_fee;
        setupFee   = 0; // already paid or on subscription
        feeNote    = feeNote || `${planInfo.label} — closing fee per plan`;
      }
    }

    const { rows } = await pool.query(
      `UPDATE tc_transactions SET
         setup_fee        = $2,
         setup_fee_waived = $3,
         closing_fee      = $4,
         closing_fee_note = $5,
         client_name      = COALESCE($6, client_name),
         client_email     = COALESCE($7, client_email),
         client_phone     = COALESCE($8, client_phone)
       WHERE id = $1
       RETURNING id, address, setup_fee, setup_fee_waived, closing_fee,
                 closing_fee_note, client_name, client_email`,
      [transactionId, setupFee, waivedSetup, closingFee, feeNote,
       clientName || null, clientEmail || null, clientPhone || null]
    ).catch(() => ({ rows: [] }));

    return rows[0] || null;
  }

  async function markCollected(transactionId, { amountCollected, notes } = {}) {
    const { rows } = await pool.query(
      `UPDATE tc_transactions SET
         fee_collected=true, fee_collected_at=NOW(),
         fee_collected_amt=$2,
         closing_fee_note=COALESCE($3, closing_fee_note)
       WHERE id=$1 RETURNING *`,
      [transactionId, amountCollected || null, notes || null]
    ).catch(() => ({ rows: [] }));
    return rows[0] || null;
  }

  async function getOutstandingFees() {
    const { rows } = await pool.query(`
      SELECT t.id, t.address, t.client_name, t.client_email, t.close_date,
             t.setup_fee, t.setup_fee_waived, t.closing_fee, t.closing_fee_note,
             (t.setup_fee + t.closing_fee) AS total_due,
             c.plan, c.monthly_fee
      FROM tc_transactions t
      LEFT JOIN tc_agent_clients c ON c.email = t.client_email
      WHERE t.status='closed' AND t.fee_collected=false
      ORDER BY t.close_date ASC
    `).catch(() => ({ rows: [] }));
    return rows;
  }

  // ── Fee statement ─────────────────────────────────────────────────────────

  async function generateFeeStatement(transactionId) {
    const { rows } = await pool.query(
      `SELECT t.*, c.plan, c.monthly_fee
       FROM tc_transactions t
       LEFT JOIN tc_agent_clients c ON c.email = t.client_email
       WHERE t.id=$1`,
      [transactionId]
    ).catch(() => ({ rows: [] }));
    const tx = rows[0];
    if (!tx) return null;

    const planInfo  = tx.plan ? PLAN_DETAILS[tx.plan] : null;
    const planLine  = planInfo ? `Plan:         ${planInfo.label} ($${tx.monthly_fee}/mo)` : '';
    const setupLine = tx.setup_fee_waived
      ? `Setup Fee:    WAIVED`
      : `Setup Fee:    $${Number(tx.setup_fee).toFixed(2)}`;
    const total = Number(tx.setup_fee) + Number(tx.closing_fee);

    return [
      `TRANSACTION COORDINATOR SERVICE AGREEMENT`,
      `═══════════════════════════════════════════`,
      ``,
      `Property:     ${tx.address}`,
      `MLS Number:   ${tx.mls_number}`,
      `Client:       ${tx.client_name || 'N/A'}`,
      `Email:        ${tx.client_email || 'N/A'}`,
      `Agent Role:   ${tx.agent_role}`,
      planLine,
      ``,
      `FEE SCHEDULE`,
      `────────────`,
      setupLine,
      `Closing Fee:  $${Number(tx.closing_fee).toFixed(2)}${tx.closing_fee_note ? ` (${tx.closing_fee_note})` : ''}`,
      `Total Due:    $${total.toFixed(2)}`,
      ``,
      `Payment:      Closing fee collected at closing from agent commission.`,
      tx.plan === PLANS.PER_TRANSACTION
        ? `Note:         Pay-at-Closing plan — no charge if transaction does not close.`
        : `Note:         Subscription plan — closing fee included in monthly rate.`,
      ``,
      `Status:       ${tx.fee_collected ? `Collected ($${Number(tx.fee_collected_amt).toFixed(2)})` : 'Pending — due at closing'}`,
      ``,
      `Services include: contract coordination, deadline tracking,`,
      `party introductions, document management, and closing assistance.`,
      ``,
      `Prepared by Lumin TC Services`,
      `Date: ${new Date().toLocaleDateString()}`,
    ].filter(l => l !== undefined).join('\n');
  }

  return {
    // Plan info
    getPlanDetails,
    getAllPlans,
    // Agent clients
    createAgentClient,
    getAgentClient,
    listAgentClients,
    markSetupPaid,
    deactivateClient,
    // Revenue
    getRevenueSummary,
    // Per-transaction
    applyToTransaction,
    markCollected,
    getOutstandingFees,
    generateFeeStatement,
  };
}
