/**
 * SYNOPSIS: Implements today_commitments timezone check against Railway UTC.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { convertToTimezone } from './timezone-utils.js';

export async function checkTodayCommitmentsTimezone(deps, payload) {
  const { pool, logger } = deps;
  const { userId } = payload || {}; // Assuming payload contains userId
  try {
    // Get all commitments for the user that are still active (not kept, broken, declined, or honourable_exit)
    // and have a due_date.
    const { rows: commitments } = await pool.query(
      `SELECT id, due_date, reminder_at, title FROM commitments WHERE user_id = $1 AND status NOT IN ('kept', 'broken', 'declined', 'honourable_exit') AND due_date IS NOT NULL`,
      [userId]
    );

    const todayCommitments = [];
    const currentDateUTC = new Date().toISOString().split('T')[0]; // Get only the date part in Railway's UTC

    for (const commitment of commitments) {
      if (commitment.due_date) {
        // Ensure due_date is a Date object for convertToTimezone
        const dueDateObj = new Date(commitment.due_date);
        const dueDateUTC = convertToTimezone(dueDateObj, 'UTC').toISOString().split('T')[0];

        // Perform the timezone check against CURRENT_DATE in Railway's UTC
        if (currentDateUTC === dueDateUTC) {
          todayCommitments.push(commitment);
        }
      }
    }

    return todayCommitments;
  } catch (error) {
    logger.error({ error, userId }, 'Error in checkTodayCommitmentsTimezone during timezone check');
    throw new Error('Failed in checkTodayCommitmentsTimezone due to database or processing error');
  }
}