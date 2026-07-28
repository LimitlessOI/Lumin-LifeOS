/**
 * SYNOPSIS: Exports recordAttempt — services/self-repair-target-reputation.js.
 */
export async function recordAttempt(pool, { target_path, model_tier, ok }) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS self_repair_target_reputation (
      target_path TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      failures INTEGER NOT NULL DEFAULT 0,
      models_tried JSONB NOT NULL DEFAULT '[]',
      hardness_score NUMERIC NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );

  const query = `
    INSERT INTO self_repair_target_reputation (target_path, attempts, failures, models_tried, hardness_score)
    VALUES ($1, 1, CASE WHEN $2 THEN 0 ELSE 1 END, $3::jsonb, CASE WHEN $2 THEN 0 ELSE 1 END::numeric)
    ON CONFLICT (target_path) DO UPDATE
    SET attempts = self_repair_target_reputation.attempts + 1,
        failures = self_repair_target_reputation.failures + CASE WHEN $2 THEN 0 ELSE 1 END,
        models_tried = (
          SELECT jsonb_agg(distinct e) FROM jsonb_array_elements(self_repair_target_reputation.models_tried || $3::jsonb) e
        ),
        hardness_score = (self_repair_target_reputation.failures + CASE WHEN $2 THEN 0 ELSE 1 END)::numeric / GREATEST(self_repair_target_reputation.attempts + 1, 1),
        updated_at = now()
  `;
  
  await pool.query(query, [target_path, ok, JSON.stringify([model_tier])]);
}

export async function getTargetReputation(pool, { target_path }) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS self_repair_target_reputation (
      target_path TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      failures INTEGER NOT NULL DEFAULT 0,
      models_tried JSONB NOT NULL DEFAULT '[]',
      hardness_score NUMERIC NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );

  const result = await pool.query(
    `SELECT * FROM self_repair_target_reputation WHERE target_path = $1`,
    [target_path]
  );

  return result.rows[0] || null;
}
