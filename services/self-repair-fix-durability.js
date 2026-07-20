/**
 * SYNOPSIS: Exports recordFixShipped — services/self-repair-fix-durability.js.
 */
import { Pool } from 'pg';

export async function recordFixShipped(pool, { fix_id, target, shipped_at = new Date() }) {
  const query = `
    INSERT INTO self_repair_fix_durability (fix_id, target, shipped_at)
    VALUES ($1, $2, $3)
  `;
  await pool.query(query, [fix_id, target, shipped_at]);
}

export async function recordRebreak(pool, { fix_id, target }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const selectQuery = `
      SELECT id, shipped_at
      FROM self_repair_fix_durability
      WHERE fix_id = $1 AND target = $2 AND rebroke_at IS NULL
      ORDER BY shipped_at DESC
      LIMIT 1
      FOR UPDATE
    `;
    const res = await client.query(selectQuery, [fix_id, target]);

    let half_life = null;

    if (res.rows.length > 0) {
      const { id, shipped_at } = res.rows[0];
      const updateQuery = `
        UPDATE self_repair_fix_durability
        SET rebroke_at = NOW(), rebreak_count = rebreak_count + 1
        WHERE id = $1
        RETURNING rebroke_at
      `;
      const updateRes = await client.query(updateQuery, [id]);
      const rebroke_at = updateRes.rows[0].rebroke_at;
      half_life = new Date(rebroke_at) - new Date(shipped_at);
    } else {
      const insertQuery = `
        INSERT INTO self_repair_fix_durability (fix_id, target, rebroke_at, rebreak_count)
        VALUES ($1, $2, NOW(), 1)
      `;
      await client.query(insertQuery, [fix_id, target]);
    }

    await client.query('COMMIT');
    return half_life;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getFixDurability(pool, { target, limit = 20 }) {
  const query = `
    SELECT id, fix_id, target, shipped_at, rebroke_at, rebreak_count,
           EXTRACT(EPOCH FROM (rebroke_at - shipped_at)) * 1000 AS half_life_ms
    FROM self_repair_fix_durability
    WHERE target = $1
    ORDER BY shipped_at DESC
    LIMIT $2
  `;
  const res = await pool.query(query, [target, limit]);
  return res.rows.map(row => ({
    ...row,
    half_life_ms: row.half_life_ms !== null ? parseInt(row.half_life_ms, 10) : null
  }));
}
