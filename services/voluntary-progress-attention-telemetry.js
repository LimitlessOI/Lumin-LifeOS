/**
 * SYNOPSIS: Exports recordAttentionObservation — services/voluntary-progress-attention-telemetry.js.
 */
import { Pool } from 'pg';

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS voluntary_progress_attention_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    product TEXT NOT NULL,
    attention_budget_observed_seconds NUMERIC,
    trust_budget_observed NUMERIC,
    knowledge_budget_observed NUMERIC,
    next_decision TEXT,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

export async function recordAttentionObservation(pool, { artifact_id, artifact_type, product, attention_budget_observed_seconds = null, trust_budget_observed = null, knowledge_budget_observed = null, next_decision = null }) {
  await pool.query(createTableQuery);
  await pool.query(
    `INSERT INTO voluntary_progress_attention_observations 
    (artifact_id, artifact_type, product, attention_budget_observed_seconds, trust_budget_observed, knowledge_budget_observed, next_decision) 
    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [artifact_id, artifact_type, product, attention_budget_observed_seconds, trust_budget_observed, knowledge_budget_observed, next_decision]
  );
}

export async function getAttentionHistory(pool, { artifact_id, limit = 50 } = {}) {
  await pool.query(createTableQuery);
  const result = await pool.query(
    `SELECT * FROM voluntary_progress_attention_observations 
    WHERE artifact_id = $1 
    ORDER BY observed_at DESC 
    LIMIT $2`,
    [artifact_id, limit]
  );
  return result.rows;
}

export async function getAttentionHistoryByProduct(pool, { product, limit = 100 } = {}) {
  await pool.query(createTableQuery);
  const result = await pool.query(
    `SELECT * FROM voluntary_progress_attention_observations 
    WHERE product = $1 
    ORDER BY observed_at DESC 
    LIMIT $2`,
    [product, limit]
  );
  return result.rows;
}