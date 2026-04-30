// services/lifeos-commitment-tracker.js
import { Pool } from 'pg';
import { createUsefulWorkGuard } from '../startup/register-schedulers.js';

const createCommitmentTrackerService = (pool: Pool) => {
  const db = pool;

  const addCommitment = async (userId: string, { text, dueDate, source }: { text: string; dueDate: Date; source: string }) => {
    const result = await db.query(
      `INSERT INTO lifeos_commitments (*uid, text, due_date, source, status, created_at)
       VALUES ($1, $2, $3, $4, 'active', NOW())
       RETURNING *`,
      [userId, text, dueDate, source]
    );
    return result.rows[0];
  };

  const getUpcomingCommitments = async (userId: string, hoursAhead: number = 24) => {
    const result = await db.query(
      `SELECT * FROM lifeos_commitments
       WHERE status = 'active' AND due_date <= NOW() + INTERVAL '$1 hour'
       ORDER BY due_date ASC`,
      [hoursAhead]
    );
    return result.rows;
  };

  const markComplete = async (userId: string, commitmentId: number) => {
    await db.query(
      `UPDATE lifeos_commitments
       SET status = 'completed'
       WHERE id = $1 AND *uid = $2`,
      [commitmentId, userId]
    );
  };

  const getOverdue = async (userId: string) => {
    const result = await db.query(
      `SELECT * FROM lifeos_commitments
       WHERE status = 'active' AND due_date < NOW()`
    );
    return result.rows;
  };

  return { addCommitment, getUpcomingCommitments, markComplete, getOverdue };
};

export default createCommitmentTrackerService;