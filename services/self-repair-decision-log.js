/**
 * SYNOPSIS: Exports recordFactoryDecision / getDecisionLog — extended with a
 * hybrid schema: stable lifecycle fields as explicit columns and flexible
 * per-role/alternatives/evidence fields in a JSONB metadata blob.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import pg from 'pg';

const EXPLICIT_COLUMNS = [
  'id',
  'decision',
  'escalation_claim',
  'tier_actually_run',
  'cost_tokens',
  'cost_ms',
  'blueprint_id',
  'blueprint_version',
  'founder_intent',
  'problem_statement',
  'consensus_status',
  'consensus_rationale',
  'predicted_outcome',
  'success_criteria',
  'failure_criteria',
  'reality_check_at',
  'reality_outcome',
  'alternatives_considered',
  'per_role_reasoning',
  'assumptions',
  'objections_and_challenges',
  'evidence',
  'implementation_trace',
  'sentry_verification',
  'resulting_lessons',
  'linked_artifacts',
  'cost_and_efficiency_analysis',
  'metadata',
  'created_at',
  'updated_at',
];

const COLUMN_DEFS = {
  id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
  decision: 'TEXT NOT NULL',
  escalation_claim: 'TEXT',
  tier_actually_run: 'TEXT',
  cost_tokens: 'INTEGER',
  cost_ms: 'INTEGER',
  blueprint_id: 'TEXT',
  blueprint_version: 'TEXT',
  founder_intent: 'TEXT',
  problem_statement: 'TEXT',
  consensus_status: 'TEXT',
  consensus_rationale: 'TEXT',
  predicted_outcome: 'TEXT',
  success_criteria: 'TEXT',
  failure_criteria: 'TEXT',
  reality_check_at: 'TIMESTAMPTZ',
  reality_outcome: 'TEXT',
  alternatives_considered: 'JSONB',
  per_role_reasoning: 'JSONB',
  assumptions: 'JSONB',
  objections_and_challenges: 'JSONB',
  evidence: 'JSONB',
  implementation_trace: 'JSONB',
  sentry_verification: 'JSONB',
  resulting_lessons: 'JSONB',
  linked_artifacts: 'JSONB',
  cost_and_efficiency_analysis: 'JSONB',
  metadata: 'JSONB',
  created_at: 'TIMESTAMPTZ NOT NULL DEFAULT now()',
  updated_at: 'TIMESTAMPTZ NOT NULL DEFAULT now()',
};

async function ensureDecisionLogSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS self_repair_decision_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      decision TEXT NOT NULL,
      escalation_claim TEXT,
      tier_actually_run TEXT,
      cost_tokens INTEGER,
      cost_ms INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  for (const [col, def] of Object.entries(COLUMN_DEFS)) {
    if (col === 'id') continue;
    await pool.query(`ALTER TABLE self_repair_decision_log ADD COLUMN IF NOT EXISTS ${col} ${def}`);
  }
}

function safeJsonb(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify(value);
    }
  }
  return JSON.stringify(value);
}

function asText(value) {
  if (value === undefined || value === null) return null;
  return String(value);
}

export async function recordFactoryDecision(pool, input) {
  const {
    decision,
    escalation_claim = null,
    tier_actually_run = null,
    cost_tokens = null,
    cost_ms = null,
    decision_id = null,
    blueprint_id = null,
    blueprint_version = null,
    founder_intent = null,
    problem_statement = null,
    consensus_status = null,
    consensus_rationale = null,
    predicted_outcome = null,
    success_criteria = null,
    failure_criteria = null,
    reality_check_at = null,
    reality_outcome = null,
    alternatives_considered = null,
    per_role_reasoning = null,
    assumptions = null,
    objections_and_challenges = null,
    evidence = null,
    implementation_trace = null,
    sentry_verification = null,
    resulting_lessons = null,
    linked_artifacts = null,
    cost_and_efficiency_analysis = null,
    metadata = null,
  } = input || {};

  await ensureDecisionLogSchema(pool);

  const values = [
    decision_id,
    asText(decision),
    asText(escalation_claim),
    asText(tier_actually_run),
    cost_tokens == null ? null : Number(cost_tokens),
    cost_ms == null ? null : Number(cost_ms),
    asText(blueprint_id),
    asText(blueprint_version),
    asText(founder_intent),
    asText(problem_statement),
    asText(consensus_status),
    asText(consensus_rationale),
    asText(predicted_outcome),
    asText(success_criteria),
    asText(failure_criteria),
    reality_check_at ? new Date(reality_check_at) : null,
    asText(reality_outcome),
    safeJsonb(alternatives_considered),
    safeJsonb(per_role_reasoning),
    safeJsonb(assumptions),
    safeJsonb(objections_and_challenges),
    safeJsonb(evidence),
    safeJsonb(implementation_trace),
    safeJsonb(sentry_verification),
    safeJsonb(resulting_lessons),
    safeJsonb(linked_artifacts),
    safeJsonb(cost_and_efficiency_analysis),
    safeJsonb(metadata),
  ];

  const placeholders = values.map((_, i) => `$${i + 1}`).join(',');
  const text = `
    INSERT INTO self_repair_decision_log (${EXPLICIT_COLUMNS.join(',')})
    VALUES (${placeholders})
    RETURNING id
  `;
  const result = await pool.query(text, values);
  return result.rows[0];
}

export async function getDecisionLog(pool, { limit = 50 } = {}) {
  const text = `
    SELECT ${EXPLICIT_COLUMNS.join(',')} FROM self_repair_decision_log
    ORDER BY created_at DESC
    LIMIT $1
  `;
  const values = [limit];
  const result = await pool.query(text, values);
  return result.rows;
}
