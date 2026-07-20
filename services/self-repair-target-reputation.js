/**
 * SYNOPSIS: Exports recordAttempt — services/self-repair-target-reputation.js.
 */
import { Pool } from 'pg';

export async function recordAttempt(pool, { target_path, model_tier, ok }) {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS self_repair_target_reputation (
        target_path TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        failures INTEGER NOT NULL DEFAULT 0,
        models_tried JSONB NOT NULL DEFAULT '[]',
        hardness_score NUMERIC NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      INSERT INTO self_repair_target_reputation (target_path, attempts, failures, models_tried, hardness_score)
      VALUES ($1, 1, CASE WHEN $3 = false THEN 1 ELSE 0 END, $4, CASE WHEN $3 = false THEN 1 ELSE 0 END)
      ON CONFLICT (target_path) DO UPDATE
      SET attempts = self_repair_target_reputation.attempts + 1,
          failures = self_repair_target_reputation.failures + CASE WHEN $3 = false THEN 1 ELSE 0 END,
          models_tried = (SELECT jsonb_agg(DISTINCT el) FROM jsonb_array_elements_text(models_tried || $4::jsonb) AS el),
          hardness_score = (self_repair_target_reputation.failures + CASE WHEN $3 = false THEN 1 ELSE 0 END)::numeric / GREATEST(self_repair_target_reputation.attempts + 1, 1),
          updated_at = now()
    `, [target_path, model_tier, ok, JSON.stringify([model_tier])]);
  } finally {
    client.release();
  }
}

export async function getTargetReputation(pool, { target_path }) {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT * FROM self_repair_target_reputation
      WHERE target_path = $1
    `, [target_path]);

    return res.rows.length > 0 ? res.rows[0] : null;
  } finally {
    client.release();
  }
}