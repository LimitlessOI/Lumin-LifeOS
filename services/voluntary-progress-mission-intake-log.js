/**
 * SYNOPSIS: Exports logMissionIntake — services/voluntary-progress-mission-intake-log.js.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { Pool } from 'pg';

export async function logMissionIntake(pool, { artifact_id, product, mission = null, customer = null, journey_stage_current = null, journey_stage_target = null, primary_objection = null, trust_strategy = null, next_voluntary_action = null, success_metric = null, consent_scope = 'internal_operational' }) {
  await pool.query(`CREATE TABLE IF NOT EXISTS voluntary_progress_mission_intake_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id TEXT NOT NULL,
    product TEXT NOT NULL,
    mission TEXT,
    customer TEXT,
    journey_stage_current TEXT,
    journey_stage_target TEXT,
    primary_objection TEXT,
    trust_strategy TEXT,
    next_voluntary_action TEXT,
    success_metric TEXT,
    intake_complete BOOLEAN NOT NULL,
    consent_scope TEXT NOT NULL DEFAULT 'internal_operational',
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const fields = { mission, customer, primary_objection, trust_strategy, next_voluntary_action, success_metric };
  const missingFields = Object.keys(fields).filter(key => !fields[key]);
  const intake_complete = missingFields.length === 0;

  try {
    await pool.query(
      `INSERT INTO voluntary_progress_mission_intake_log (artifact_id, product, mission, customer, journey_stage_current, journey_stage_target, primary_objection, trust_strategy, next_voluntary_action, success_metric, intake_complete, consent_scope) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [artifact_id, product, mission, customer, journey_stage_current, journey_stage_target, primary_objection, trust_strategy, next_voluntary_action, success_metric, intake_complete, consent_scope]
    );
    return { intake_complete, missing_fields: missingFields };
  } catch (error) {
    return { intake_complete: false, missing_fields: ['logging_failed'], logging_error: String(error.message || error) };
  }
}

export async function getMissionIntakeStats(pool, { product, since = null } = {}) {
  await pool.query(`CREATE TABLE IF NOT EXISTS voluntary_progress_mission_intake_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id TEXT NOT NULL,
    product TEXT NOT NULL,
    mission TEXT,
    customer TEXT,
    journey_stage_current TEXT,
    journey_stage_target TEXT,
    primary_objection TEXT,
    trust_strategy TEXT,
    next_voluntary_action TEXT,
    success_metric TEXT,
    intake_complete BOOLEAN NOT NULL,
    consent_scope TEXT NOT NULL DEFAULT 'internal_operational',
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);

  const query = `
    SELECT 
      COUNT(*)::INTEGER AS total,
      COUNT(*) FILTER (WHERE intake_complete) AS complete,
      COUNT(*) FILTER (WHERE NOT intake_complete) AS incomplete,
      (COUNT(*) FILTER (WHERE NOT intake_complete) * 1.0 / COUNT(*)) AS incomplete_rate
    FROM voluntary_progress_mission_intake_log
    WHERE product = $1
    ${since ? 'AND logged_at >= $2' : ''}
  `;

  try {
    const result = await pool.query(query, since ? [product, since] : [product]);
    return result.rows[0];
  } catch (error) {
    return { total: 0, complete: 0, incomplete: 0, incomplete_rate: 0 };
  }
}