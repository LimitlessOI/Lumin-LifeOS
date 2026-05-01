/**
 * Summarizes habit completion activity for ambient nudges (7-day window).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

/**
 * Returns `[{ streak: n }]` when `n > 0` completions in rolling 7-day window,
 * otherwise `[]` (ambient treats empty as low streak).
 *
 * @returns {(pool: import('pg').Pool, userId: number, filter: object) => Promise<Array<{ streak: number }>>}
 */
export function makeLifeOSHabitCompletionsResolver() {
  return async (pool, userId, _filter) => {
    try {
      const uid = Number(userId);
      if (!Number.isFinite(uid)) return [];

      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n
           FROM lifeos_habit_completions
          WHERE user_id = $1
            AND completed_date >= CURRENT_DATE - INTERVAL '7 days'`,
        [uid],
      );
      const n = rows[0]?.n ?? 0;
      return n === 0 ? [] : [{ streak: n }];
    } catch {
      return [];
    }
  };
}
