/**
 * services/dream-funding.js
 *
 * Tracks dreams, funding progress, and the pay-forward chain.
 * When a dream threshold is hit, prompts for pay-forward selection.
 *
 * Exports: createDreamFunding({ pool })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createDreamFunding({ pool }) {
  // ── createDream ─────────────────────────────────────────────────────────────
  async function createDream({ userId, title, description, category, targetAmount, targetDate }) {
    const { rows } = await pool.query(
      `INSERT INTO dreams
         (user_id, title, description, category, target_amount, target_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, title, description || null, category || null, targetAmount || null, targetDate || null]
    );
    return rows[0];
  }

  // ── updateFunding ────────────────────────────────────────────────────────────
  /**
   * Add an amount to funded_amount.
   * Returns { dream, funded: boolean, pay_forward_due: number|null }
   */
  async function updateFunding(dreamId, amount) {
    const { rows } = await pool.query(
      `UPDATE dreams
          SET funded_amount = funded_amount + $2,
              updated_at    = NOW()
        WHERE id = $1
        RETURNING *`,
      [dreamId, amount]
    );
    const dream = rows[0];
    if (!dream) throw new Error(`Dream ${dreamId} not found`);

    const funded =
      dream.target_amount !== null &&
      parseFloat(dream.funded_amount) >= parseFloat(dream.target_amount) * 0.9;

    const pay_forward_due = funded
      ? parseFloat(dream.target_amount) * 0.1
      : null;

    return { dream, funded, pay_forward_due };
  }

  // ── recordPayForward ─────────────────────────────────────────────────────────
  async function recordPayForward(dreamId, { amount, recipient }) {
    const { rows } = await pool.query(
      `UPDATE dreams
          SET pay_forward_done      = TRUE,
              pay_forward_amount    = $2,
              pay_forward_recipient = $3,
              updated_at            = NOW()
        WHERE id = $1
        RETURNING *`,
      [dreamId, amount, recipient]
    );
    const dream = rows[0];
    if (!dream) throw new Error(`Dream ${dreamId} not found`);
    return dream;
  }

  // ── completeDream ────────────────────────────────────────────────────────────
  async function completeDream(dreamId) {
    const { rows } = await pool.query(
      `UPDATE dreams
          SET status       = 'completed',
              completed_at = NOW(),
              updated_at   = NOW()
        WHERE id = $1
        RETURNING *`,
      [dreamId]
    );
    const dream = rows[0];
    if (!dream) throw new Error(`Dream ${dreamId} not found`);
    return dream;
  }

  // ── getDreams ────────────────────────────────────────────────────────────────
  async function getDreams(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM dreams
        WHERE user_id = $1
        ORDER BY
          CASE status
            WHEN 'active'      THEN 1
            WHEN 'in_progress' THEN 2
            WHEN 'funded'      THEN 3
            WHEN 'paused'      THEN 4
            WHEN 'completed'   THEN 5
            ELSE 6
          END,
          created_at DESC`,
      [userId]
    );
    return rows;
  }

  // ── getDream ─────────────────────────────────────────────────────────────────
  async function getDream(dreamId) {
    const { rows } = await pool.query(
      'SELECT * FROM dreams WHERE id = $1',
      [dreamId]
    );
    return rows[0] || null;
  }

  return { createDream, updateFunding, recordPayForward, completeDream, getDreams, getDream };
}
