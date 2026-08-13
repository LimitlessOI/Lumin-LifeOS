/**
 * SYNOPSIS: Binder GPS / location records for CollectibleTwins.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */

/**
 * @param {{ pool: import('pg').Pool, logger?: object }} deps
 */
export function createLocationService({ pool, logger } = {}) {
  if (!pool) throw new Error('pool required');
  const log = logger || { info() {}, warn() {}, error() {} };

  async function putLocation(twinId, body = {}, actorUserId = null) {
    if (!twinId) throw new Error('twinId required');
    const location_kind = String(body.location_kind || 'binder');
    const label = String(body.label || 'Unlabeled location');
    const structured = body.structured && typeof body.structured === 'object' ? body.structured : {};
    const geo_precision = body.geo ? 'approx' : 'none';
    const geo = body.geo && typeof body.geo === 'object' ? body.geo : null;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE location_records SET ended_at = NOW()
          WHERE twin_id = $1 AND ended_at IS NULL`,
        [twinId],
      );
      const inserted = await client.query(
        `INSERT INTO location_records
           (id, twin_id, location_kind, label, structured, geo_precision, geo)
         VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, $5, $6::jsonb)
         RETURNING id, twin_id, location_kind, label, structured, geo_precision, geo, started_at`,
        [twinId, location_kind, label, JSON.stringify(structured), geo_precision, geo ? JSON.stringify(geo) : null],
      );
      await client.query(
        `INSERT INTO collectible_audit_events (id, twin_id, actor_user_id, event_type, payload)
         VALUES (gen_random_uuid(), $1, $2, 'location_put', $3::jsonb)`,
        [twinId, actorUserId, JSON.stringify({ location_kind, label })],
      );
      await client.query('COMMIT');
      log.info?.({ twinId, location_kind }, 'putLocation');
      return inserted.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async function getActiveLocation(twinId) {
    const result = await pool.query(
      `SELECT id, twin_id, location_kind, label, structured, geo_precision, geo, started_at
         FROM location_records
        WHERE twin_id = $1 AND ended_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1`,
      [twinId],
    );
    return result.rows[0] || null;
  }

  return { putLocation, getActiveLocation };
}
