/**
 * Resolver for overdue / open MIT rows (daily_mits table).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

/**
 * @returns {(pool: import('pg').Pool, userId: number, filter: object) => Promise<Array<Record<string, unknown>>>}
 */
export function makeLifeOSMitsResolver() {
  return async (pool, userId, _filter) => {
    const { rows } = await pool.query(
      `SELECT *
         FROM daily_mits
        WHERE user_id = $1
          AND status = 'pending'
          AND mit_date < CURRENT_DATE
        ORDER BY mit_date ASC, position ASC
        LIMIT 40`,
      [userId],
    );
    return rows || [];
  };
}
