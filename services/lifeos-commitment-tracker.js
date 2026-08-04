/**
 * SYNOPSIS: Tracks commitments Adam makes and surfaces upcoming/overdue ones.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * Tracks commitments Adam makes and surfaces upcoming/overdue ones.
 * Table: commitments (the shared canonical table also written by
 * services/lifeos-commitment-service.js (Chair), routes/word-keeper-routes.js,
 * and services/mission-ledger.js). GAP-FILL 2026-08-04: this service previously
 * read/wrote a second, disconnected table (lifeos_commitments) that no other
 * caller in the codebase ever populated -- confirmed via live query the table
 * held 0 rows while `commitments` held 11 real rows -- so every production
 * dashboard/quick-entry/today-view surface (they all call this service via
 * routes/lifeos-commitment-routes.js) was reading an always-empty table while
 * Chair's real writes landed in `commitments`, invisible to them. Repointed to
 * the canonical table using its existing LifeOS-shape columns (title/due_at/
 * status) rather than creating a third table or renaming this service.
 */

export function createCommitmentTrackerService(pool) {
  async function addCommitment(userId, { text, title, dueDate, due_at, source = 'manual' }) {
    const resolvedTitle = title || text;
    const resolvedDueAt = due_at || dueDate || null;
    const { rows } = await pool.query(
      `INSERT INTO commitments (user_id, title, text, due_at, source, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'open', NOW()) RETURNING *`,
      [userId, resolvedTitle, resolvedTitle, resolvedDueAt, source]
    );
    return rows[0];
  }

  async function getUpcomingCommitments(userId, hoursAhead = 24) {
    // GAP-FILL 2026-08-04: no floor meant this also returned every past-due
    // 'open' row ever created (unbounded backward), mixed in with genuinely
    // upcoming ones -- confirmed live the dashboard route's fixed 48h window
    // still surfaced weeks-old test/seed rows ahead of a real new commitment.
    const { rows } = await pool.query(
      `SELECT * FROM commitments
       WHERE user_id = $1 AND status = 'open' AND due_at >= NOW() AND due_at <= NOW() + ($2 || ' hours')::interval
       ORDER BY due_at ASC NULLS LAST`,
      [userId, hoursAhead]
    );
    return rows;
  }

  async function markComplete(userId, commitmentId) {
    await pool.query(
      `UPDATE commitments SET status = 'completed', kept_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [commitmentId, userId]
    );
  }

  async function getOverdue(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM commitments
       WHERE user_id = $1 AND status = 'open' AND due_at < NOW()
       ORDER BY due_at ASC`,
      [userId]
    );
    return rows;
  }

  return { addCommitment, getUpcomingCommitments, markComplete, getOverdue };
}
