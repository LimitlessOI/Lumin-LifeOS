/**
 * SYNOPSIS: Exports recordFixShipped — services/self-repair-fix-durability.js.
 */
import { Pool } from 'pg';

export async function recordFixShipped(pool, { fix_id, target, shipped_at = new Date() }) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS self_repair_fix_durability (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
      fix_id TEXT NOT NULL, 
      target TEXT NOT NULL, 
      shipped_at TIMESTAMPTZ NOT NULL, 
      rebroke_at TIMESTAMPTZ, 
      rebreak_count INTEGER NOT NULL DEFAULT 0, 
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );
  const query = `
    INSERT INTO self_repair_fix_durability (fix_id, target, shipped_at)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [fix_id, target, shipped_at];
  const res = await pool.query(query, values);
  return res.rows[0];
}

export async function recordRebreak(pool, { fix_id, target }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `CREATE TABLE IF NOT EXISTS self_repair_fix_durability (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
        fix_id TEXT NOT NULL, 
        target TEXT NOT NULL, 
        shipped_at TIMESTAMPTZ NOT NULL, 
        rebroke_at TIMESTAMPTZ, 
        rebreak_count INTEGER NOT NULL DEFAULT 0, 
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
    );
    const selectQuery = `
      SELECT id, shipped_at 
      FROM self_repair_fix_durability 
      WHERE fix_id = $1 AND target = $2 AND rebroke_at IS NULL 
      ORDER BY shipped_at DESC 
      LIMIT 1;
    `;
    const selectValues = [fix_id, target];
    const selectResult = await client.query(selectQuery, selectValues);

    if (selectResult.rows.length > 0) {
      const { id, shipped_at } = selectResult.rows[0];
      const updateQuery = `
        UPDATE self_repair_fix_durability 
        SET rebroke_at = now(), rebreak_count = rebreak_count + 1 
        WHERE id = $1 
        RETURNING rebroke_at, shipped_at;
      `;
      const updateValues = [id];
      const updateResult = await client.query(updateQuery, updateValues);
      const { rebroke_at } = updateResult.rows[0];
      await client.query('COMMIT');
      return rebroke_at - shipped_at;
    } else {
      const insertQuery = `
        INSERT INTO self_repair_fix_durability (fix_id, target, shipped_at, rebroke_at, rebreak_count)
        VALUES ($1, $2, now(), now(), 1)
        RETURNING rebroke_at, shipped_at;
      `;
      const insertValues = [fix_id, target];
      const insertResult = await client.query(insertQuery, insertValues);
      const { rebroke_at, shipped_at } = insertResult.rows[0];
      await client.query('COMMIT');
      return rebroke_at - shipped_at;
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getFixDurability(pool, { target, limit = 20 }) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS self_repair_fix_durability (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
      fix_id TEXT NOT NULL, 
      target TEXT NOT NULL, 
      shipped_at TIMESTAMPTZ NOT NULL, 
      rebroke_at TIMESTAMPTZ, 
      rebreak_count INTEGER NOT NULL DEFAULT 0, 
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );
  const query = `
    SELECT *, 
    CASE 
      WHEN rebroke_at IS NOT NULL THEN EXTRACT(EPOCH FROM (rebroke_at - shipped_at)) * 1000 
      ELSE NULL 
    END AS half_life_ms 
    FROM self_repair_fix_durability 
    WHERE target = $1 
    ORDER BY shipped_at DESC 
    LIMIT $2;
  `;
  const values = [target, limit];
  const res = await pool.query(query, values);
  return res.rows;
}