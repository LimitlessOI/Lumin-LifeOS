/**
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * Tracks commitments Adam makes and surfaces upcoming/overdue ones.
 * Table: lifeos_commitments (id, user_id, text, due_date, source, status, created_at, completed_at)
 */

export function createCommitmentTrackerService(pool) {
  async function addCommitment(userId, { text, dueDate, source = 'manual' }) {
    const { rows } = await pool.query(
      `INSERT INTO lifeos_commitments (user_id, text, due_date, source, status, created_at)
       VALUES ($1, $2, $3, $4, 'active', NOW()) RETURNING *`,
      [userId, text, dueDate || null, source]
    );
    return rows[0];
  }

  async function getUpcomingCommitments(userId, hoursAhead = 24) {
    const { rows } = await pool.query(
      `SELECT * FROM lifeos_commitments
       WHERE user_id = $1 AND status = 'active' AND due_date <= NOW() + ($2 || ' hours')::interval
       ORDER BY due_date ASC`,
      [userId, hoursAhead]
    );
    return rows;
  }

  async function markComplete(userId, commitmentId) {
    await pool.query(
      `UPDATE lifeos_commitments SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [commitmentId, userId]
    );
  }

  async function getOverdue(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM lifeos_commitments
       WHERE user_id = $1 AND status = 'active' AND due_date < NOW()
       ORDER BY due_date ASC`,
      [userId]
    );
    return rows;
  }

  return { addCommitment, getUpcomingCommitments, markComplete, getOverdue };
}
