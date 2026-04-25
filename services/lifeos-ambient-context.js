/**
 * LifeOS ambient context — stores lightweight, opt-in device/environment hints
 * (battery, network class, visibility) for Lumin grounding. No microphone data,
 * no continuous AI on ingest.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const MAX_SIGNALS_BYTES = 16_384;

/**
 * @param {object} opts
 * @param {import('pg').Pool} opts.pool
 * @param {Console} [opts.logger]
 */
export function createLifeOSAmbientContextService({ pool, logger = console }) {
  /**
   * @param {number} userId
   * @param {Record<string, unknown>} signals
   */
  async function appendSnapshot(userId, signals) {
    const json = JSON.stringify(signals ?? {});
    if (json.length > MAX_SIGNALS_BYTES) {
      throw Object.assign(new Error('signals payload too large'), { status: 400 });
    }
    const { rows } = await pool.query(
      `INSERT INTO lifeos_ambient_snapshots (user_id, signals)
       VALUES ($1, $2::jsonb)
       RETURNING id, created_at`,
      [userId, json],
    );
    return rows[0];
  }

  /**
   * Recent rows for Lumin context (compact).
   * @param {number} userId
   * @param {number} [limit]
   */
  async function listRecent(userId, limit = 6) {
    const lim = Math.max(1, Math.min(20, parseInt(String(limit), 10) || 6));
    const { rows } = await pool.query(
      `SELECT id, signals, created_at
         FROM lifeos_ambient_snapshots
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [userId, lim],
    );
    return rows;
  }

  /**
   * Best-effort: if table missing, returns [].
   */
  async function listRecentSafe(userId, limit = 6) {
    try {
      return await listRecent(userId, limit);
    } catch (err) {
      logger.warn?.('[lifeos-ambient-context] listRecent failed:', err.message);
      return [];
    }
  }

  return { appendSnapshot, listRecent, listRecentSafe };
}
