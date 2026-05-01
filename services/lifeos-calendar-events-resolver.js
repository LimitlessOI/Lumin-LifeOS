/**
 * Curried resolver for ambient / nudge paths: upcoming LifeOS calendar events in a window.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

/**
 * @returns {(pool: import('pg').Pool, userId: number, horizonEnd: Date) => Promise<Array<Record<string, unknown>>>}
 */
export function makeLifeOSCalendarEventsResolver() {
  return async (pool, userId, horizonEnd) => {
    const from = new Date();
    const to =
      horizonEnd instanceof Date && !Number.isNaN(horizonEnd.getTime())
        ? horizonEnd
        : new Date(from.getTime() + 3 * 60 * 60 * 1000);

    const { rows } = await pool.query(
      `SELECT e.*, e.title AS name
         FROM lifeos_calendar_events e
        WHERE e.user_id = $1
          AND e.status IS DISTINCT FROM 'deleted'
          AND e.starts_at >= $2::timestamptz
          AND e.starts_at <= $3::timestamptz
        ORDER BY e.starts_at ASC
        LIMIT 40`,
      [userId, from.toISOString(), to.toISOString()],
    );

    return rows.map((r) => ({
      ...r,
      starts_at:
        r.starts_at instanceof Date ? r.starts_at : r.starts_at ? new Date(r.starts_at) : new Date(),
      name: r.title || r.name || '',
    }));
  };
}
