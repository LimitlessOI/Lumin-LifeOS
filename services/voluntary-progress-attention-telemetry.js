/**
 * SYNOPSIS: Exports recordAttentionObservation — services/voluntary-progress-attention-telemetry.js.
 */
import { Pool } from 'pg';

export async function recordAttentionObservation(pool, { artifact_id, artifact_type, product, attention_budget_observed_seconds = null, trust_budget_observed = null, knowledge_budget_observed = null, next_decision = null, consent_scope = 'internal_operational' }) {
  await pool.query(`CREATE TABLE IF NOT EXISTS voluntary_progress_attention_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    product TEXT NOT NULL,
    attention_budget_observed_seconds NUMERIC,
    trust_budget_observed NUMERIC,
    knowledge_budget_observed NUMERIC,
    next_decision TEXT,
    consent_scope TEXT NOT NULL DEFAULT 'internal_operational',
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  
  await pool.query(
    `INSERT INTO voluntary_progress_attention_observations (
      artifact_id, artifact_type, product, attention_budget_observed_seconds,
      trust_budget_observed, knowledge_budget_observed, next_decision, consent_scope
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [artifact_id, artifact_type, product, attention_budget_observed_seconds, trust_budget_observed, knowledge_budget_observed, next_decision, consent_scope]
  );
}

export async function getAttentionHistory(pool, { artifact_id, limit = 50 } = {}) {
  await pool.query(`CREATE TABLE IF NOT EXISTS voluntary_progress_attention_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    product TEXT NOT NULL,
    attention_budget_observed_seconds NUMERIC,
    trust_budget_observed NUMERIC,
    knowledge_budget_observed NUMERIC,
    next_decision TEXT,
    consent_scope TEXT NOT NULL DEFAULT 'internal_operational',
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  
  const res = await pool.query(
    `SELECT * FROM voluntary_progress_attention_observations
     WHERE artifact_id = $1
     ORDER BY observed_at DESC
     LIMIT $2`,
    [artifact_id, limit]
  );
  return res.rows;
}

export async function getAttentionHistoryByProduct(pool, { product, limit = 100 } = {}) {
  await pool.query(`CREATE TABLE IF NOT EXISTS voluntary_progress_attention_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    product TEXT NOT NULL,
    attention_budget_observed_seconds NUMERIC,
    trust_budget_observed NUMERIC,
    knowledge_budget_observed NUMERIC,
    next_decision TEXT,
    consent_scope TEXT NOT NULL DEFAULT 'internal_operational',
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  
  const res = await pool.query(
    `SELECT * FROM voluntary_progress_attention_observations
     WHERE product = $1
     ORDER BY observed_at DESC
     LIMIT $2`,
    [product, limit]
  );
  return res.rows;
}
