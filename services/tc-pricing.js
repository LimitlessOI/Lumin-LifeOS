/**
 * tc-pricing.js
 * TC fee management — setup fee + closing fee per transaction.
 *
 * Pricing model:
 *   - Setup fee:   default $199, waivable
 *   - Closing fee: default $200, negotiable down to min ($99), collected at closing
 *
 * Exports: createTCPricing(deps)
 */

const DEFAULTS = {
  setup_fee:   199,
  closing_fee: 200,
  min_closing: 99,
};

export function createTCPricing({ pool, logger = console }) {

  async function getConfig() {
    const { rows } = await pool.query(`SELECT * FROM tc_pricing_config WHERE id=1`).catch(() => ({ rows: [] }));
    return rows[0] || {
      default_setup_fee:   DEFAULTS.setup_fee,
      default_closing_fee: DEFAULTS.closing_fee,
      waive_setup_allowed: true,
      min_closing_fee:     DEFAULTS.min_closing,
    };
  }

  async function updateConfig({ defaultSetupFee, defaultClosingFee, waiveSetupAllowed, minClosingFee, notes } = {}) {
    const fields = ['updated_at=NOW()'];
    const params = [];
    const add = (col, val) => { params.push(val); fields.push(`${col}=$${params.length}`); };

    if (defaultSetupFee   !== undefined) add('default_setup_fee',   defaultSetupFee);
    if (defaultClosingFee !== undefined) add('default_closing_fee',  defaultClosingFee);
    if (waiveSetupAllowed !== undefined) add('waive_setup_allowed',  waiveSetupAllowed);
    if (minClosingFee     !== undefined) add('min_closing_fee',      minClosingFee);
    if (notes             !== undefined) add('notes',                notes);

    const { rows } = await pool.query(
      `UPDATE tc_pricing_config SET ${fields.join(',')} WHERE id=1 RETURNING *`, params
    ).catch(() => ({ rows: [] }));
    return rows[0];
  }

  /**
   * Apply pricing to a transaction on creation.
   * Respects waivers and custom amounts.
   */
  async function applyToTransaction(transactionId, {
    waivedSetup = false,
    customSetupFee,
    customClosingFee,
    closingFeeNote,
    clientName,
    clientEmail,
    clientPhone,
  } = {}) {
    const config = await getConfig();

    const setupFee    = waivedSetup ? 0 : (customSetupFee ?? config.default_setup_fee);
    const closingFee  = Math.max(
      customClosingFee ?? config.default_closing_fee,
      config.min_closing_fee
    );

    const { rows } = await pool.query(
      `UPDATE tc_transactions SET
         setup_fee        = $2,
         setup_fee_waived = $3,
         closing_fee      = $4,
         closing_fee_note = $5,
         client_name      = $6,
         client_email     = $7,
         client_phone     = $8
       WHERE id = $1
       RETURNING id, address, setup_fee, setup_fee_waived, closing_fee, closing_fee_note,
                 client_name, client_email`,
      [transactionId, setupFee, waivedSetup, closingFee, closingFeeNote || null,
       clientName || null, clientEmail || null, clientPhone || null]
    ).catch(() => ({ rows: [] }));

    const tx = rows[0];
    if (tx) {
      const totalDue = Number(tx.setup_fee) + Number(tx.closing_fee);
      logger.info?.({ transactionId, setupFee, closingFee, totalDue }, '[TC-PRICING] Fees applied');
    }
    return tx || null;
  }

  /**
   * Mark closing fee as collected.
   */
  async function markCollected(transactionId, { amountCollected, notes } = {}) {
    const { rows } = await pool.query(
      `UPDATE tc_transactions SET
         fee_collected     = true,
         fee_collected_at  = NOW(),
         fee_collected_amt = $2,
         closing_fee_note  = COALESCE($3, closing_fee_note)
       WHERE id = $1
       RETURNING *`,
      [transactionId, amountCollected || null, notes || null]
    ).catch(() => ({ rows: [] }));
    return rows[0] || null;
  }

  /**
   * Summary of all fees — earned, pending, uncollected on closed deals.
   */
  async function getFeeSummary() {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                               AS total_transactions,
        COUNT(*) FILTER (WHERE status='closed')                AS closed,
        COUNT(*) FILTER (WHERE status='closed' AND fee_collected)    AS collected,
        COUNT(*) FILTER (WHERE status='closed' AND NOT fee_collected) AS uncollected,
        COALESCE(SUM(setup_fee) FILTER (WHERE NOT setup_fee_waived), 0) AS total_setup_fees,
        COALESCE(SUM(closing_fee), 0)                          AS total_closing_fees_expected,
        COALESCE(SUM(fee_collected_amt), 0)                    AS total_collected,
        COALESCE(SUM(closing_fee) FILTER (WHERE status='closed' AND NOT fee_collected), 0) AS outstanding
      FROM tc_transactions
    `).catch(() => ({ rows: [{}] }));
    return rows[0];
  }

  /**
   * List closed deals with outstanding (uncollected) fees.
   */
  async function getOutstandingFees() {
    const { rows } = await pool.query(`
      SELECT id, address, client_name, client_email, close_date,
             setup_fee, setup_fee_waived, closing_fee, closing_fee_note,
             (setup_fee + closing_fee) AS total_due
      FROM tc_transactions
      WHERE status='closed' AND fee_collected=false
      ORDER BY close_date ASC
    `).catch(() => ({ rows: [] }));
    return rows;
  }

  /**
   * Generate a plain-text fee agreement / invoice for a transaction.
   */
  async function generateFeeStatement(transactionId) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_transactions WHERE id=$1`, [transactionId]
    ).catch(() => ({ rows: [] }));
    const tx = rows[0];
    if (!tx) return null;

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
      `Agent Role:   ${tx.agent_role}`,
      ``,
      `FEE SCHEDULE`,
      `────────────`,
      setupLine,
      `Closing Fee:  $${Number(tx.closing_fee).toFixed(2)}${tx.closing_fee_note ? ` (${tx.closing_fee_note})` : ''}`,
      `Total Due:    $${total.toFixed(2)}`,
      ``,
      `Payment:      Collected at closing from agent commission`,
      ``,
      `Status:       ${tx.fee_collected ? `Collected ($${Number(tx.fee_collected_amt).toFixed(2)})` : 'Pending — due at closing'}`,
      ``,
      `Services include: contract coordination, deadline monitoring,`,
      `party introductions, document management, and closing assistance.`,
      ``,
      `Prepared by Lumin LifeOS TC System`,
      `Date: ${new Date().toLocaleDateString()}`,
    ].join('\n');
  }

  return {
    getConfig,
    updateConfig,
    applyToTransaction,
    markCollected,
    getFeeSummary,
    getOutstandingFees,
    generateFeeStatement,
  };
}
